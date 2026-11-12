package com.example.ui.viewmodel

import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Schema
import com.google.firebase.ai.type.content
import com.google.firebase.ai.type.generationConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.io.ByteArrayOutputStream

private const val TAG = "NewsAiViewModel"
private const val INFERENCE_TIMEOUT_MS = 60_000L
private const val MAX_INLINE_MEDIA_BYTES = 20L * 1024L * 1024L

data class GeneratedNewsCard(
    val headline: String,
    val subHeadline: String,
    val summary: String,
    val socialCaption: String,
    val hashtags: List<String>
)

sealed interface AiUiState {
    data object Idle : AiUiState
    data object Loading : AiUiState
    data class Streaming(val text: String) : AiUiState
    data class Success(
        val text: String,
        val structuredCard: GeneratedNewsCard? = null
    ) : AiUiState

    data class Error(val message: String) : AiUiState
}

class NewsAiViewModel : ViewModel() {

    private val newsCardSchema by lazy {
        Schema.obj(
            properties = mapOf(
                "headline" to Schema.string(description = "Crisp breaking news headline in Hindi or English matching the source language"),
                "subHeadline" to Schema.string(description = "Supporting sub-headline adding key context"),
                "summary" to Schema.string(description = "Concise 2-3 sentence news summary for a graphic card"),
                "socialCaption" to Schema.string(description = "Engaging social media caption for sharing the news card"),
                "hashtags" to Schema.array(
                    items = Schema.string(),
                    description = "3 to 5 relevant hashtags without spaces"
                )
            ),
            optionalProperties = listOf("subHeadline", "hashtags")
        )
    }

    private val generativeModel by lazy {
        Firebase.ai.generativeModel("gemini-3.8-flash")
    }

    private val structuredNewsModel by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            generationConfig = generationConfig {
                responseMimeType = "application/json"
                responseSchema = newsCardSchema
            }
        )
    }

    private val _uiState = MutableStateFlow<AiUiState>(AiUiState.Idle)
    val uiState: StateFlow<AiUiState> = _uiState.asStateFlow()

    fun resetState() {
        _uiState.value = AiUiState.Idle
    }

    fun generateContent(prompt: String) {
        if (prompt.isBlank()) {
            _uiState.value = AiUiState.Error("Please enter a prompt or news topic.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AiUiState.Loading
            try {
                val response = withTimeout(INFERENCE_TIMEOUT_MS) {
                    generativeModel.generateContent(prompt)
                }
                val text = response.text
                if (!text.isNullOrBlank()) {
                    _uiState.value = AiUiState.Success(text = text)
                } else {
                    _uiState.value = AiUiState.Error("Model returned an empty response.")
                }
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "Generation timed out", e)
                _uiState.value = AiUiState.Error(
                    "Generation timed out after 60 seconds. Please try again."
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Firebase AI generation failed", e)
                _uiState.value = AiUiState.Error(
                    e.localizedMessage ?: "Generation failed."
                )
            }
        }
    }

    fun generateStream(prompt: String) {
        if (prompt.isBlank()) {
            _uiState.value = AiUiState.Error("Please enter a prompt to stream.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AiUiState.Loading
            val accumulatedText = StringBuilder()
            try {
                withTimeout(INFERENCE_TIMEOUT_MS) {
                    generativeModel.generateContentStream(prompt).collect { chunk ->
                        val chunkText = chunk.text.orEmpty()
                        if (chunkText.isNotEmpty()) {
                            accumulatedText.append(chunkText)
                            _uiState.value = AiUiState.Streaming(accumulatedText.toString())
                        }
                    }
                }
                val finalText = accumulatedText.toString()
                if (finalText.isNotBlank()) {
                    _uiState.value = AiUiState.Success(text = finalText)
                } else {
                    _uiState.value = AiUiState.Error("Model returned an empty response.")
                }
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "Streaming timed out", e)
                _uiState.value = AiUiState.Error(
                    "Streaming timed out after 60 seconds. Please try again."
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Streaming generation failed", e)
                _uiState.value = AiUiState.Error(
                    e.localizedMessage ?: "Streaming failed."
                )
            }
        }
    }

    fun generateStructuredNews(articleOrTopic: String) {
        if (articleOrTopic.isBlank()) {
            _uiState.value = AiUiState.Error("Please provide an article or topic to format.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AiUiState.Loading
            try {
                val prompt = buildString {
                    appendLine("You are a senior digital newsroom editor.")
                    appendLine("Transform the following news topic or article into a crisp breaking news graphic card JSON.")
                    appendLine("Preserve the input language (Hindi or English) and keep the headline punchy.")
                    appendLine()
                    appendLine(articleOrTopic)
                }
                val response = withTimeout(INFERENCE_TIMEOUT_MS) {
                    structuredNewsModel.generateContent(prompt)
                }
                val jsonString = response.text
                    ?: throw IllegalStateException("Model returned empty structured response.")

                val json = JSONObject(jsonString)
                val headline = json.getString("headline")
                val subHeadline = json.optString("subHeadline", "")
                val summary = json.getString("summary")
                val socialCaption = json.getString("socialCaption")
                val hashtagsJson = json.optJSONArray("hashtags")
                val hashtags = if (hashtagsJson != null) {
                    (0 until hashtagsJson.length()).mapNotNull { idx ->
                        hashtagsJson.optString(idx).takeIf { it.isNotBlank() }
                    }
                } else {
                    emptyList()
                }

                val card = GeneratedNewsCard(
                    headline = headline,
                    subHeadline = subHeadline,
                    summary = summary,
                    socialCaption = socialCaption,
                    hashtags = hashtags
                )
                _uiState.value = AiUiState.Success(
                    text = jsonString,
                    structuredCard = card
                )
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "Structured news generation timed out", e)
                _uiState.value = AiUiState.Error(
                    "Structured news generation timed out after 60 seconds. Please try again."
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Failed to generate structured news JSON", e)
                _uiState.value = AiUiState.Error(
                    e.localizedMessage ?: "Failed to generate structured news."
                )
            }
        }
    }

    fun analyzeNewsContent(prompt: String, bitmap: Bitmap? = null) {
        if (prompt.isBlank() && bitmap == null) {
            _uiState.value = AiUiState.Error("Please provide text or an image to analyze.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AiUiState.Loading
            try {
                if (bitmap != null) {
                    val encodedSizeBytes = estimateCompressedJpegSizeBytes(bitmap)
                    if (encodedSizeBytes > MAX_INLINE_MEDIA_BYTES) {
                        _uiState.value = AiUiState.Error(
                            "Selected image exceeds the 20MB inline media limit. Please choose a smaller image."
                        )
                        return@launch
                    }
                }

                val requestContent = content {
                    if (bitmap != null) {
                        image(bitmap)
                    }
                    text(prompt.ifBlank { "Analyze this news image and summarize the key story details." })
                }

                val response = withTimeout(INFERENCE_TIMEOUT_MS) {
                    generativeModel.generateContent(requestContent)
                }
                val text = response.text
                if (!text.isNullOrBlank()) {
                    _uiState.value = AiUiState.Success(text = text)
                } else {
                    _uiState.value = AiUiState.Error("Model returned an empty response.")
                }
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "Multimodal analysis timed out", e)
                _uiState.value = AiUiState.Error(
                    "Analysis timed out after 60 seconds. Please try again."
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Multimodal news analysis failed", e)
                _uiState.value = AiUiState.Error(
                    e.localizedMessage ?: "Multimodal analysis failed."
                )
            }
        }
    }

    private fun estimateCompressedJpegSizeBytes(bitmap: Bitmap): Long {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
        return stream.size().toLong()
    }
}
