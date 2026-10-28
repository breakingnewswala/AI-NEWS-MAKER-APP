package com.example.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.AudioStudioEngine
import com.example.model.*
import com.example.util.NewsVideoRenderer
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

enum class NavigationTab {
    TEMPLATES,
    STUDIO,
    SAVED,
    CATEGORIES
}

data class NewsMakerUiState(
    val currentTab: NavigationTab = NavigationTab.STUDIO,
    val selectedCategory: TemplateCategory = TemplateCategory.BASIC,
    val selectedTemplate: NewsTemplate = TemplateRepository.GRAPHIC_1,
    val customTemplates: List<NewsTemplate> = emptyList(),
    val savedProjects: List<NewsProject> = emptyList(),
    val isMediaPlaying: Boolean = false,
    val isVideo: Boolean = false,
    val mediaUri: Uri? = null,
    val editingVideoUri: Uri? = null,
    val currentAspectCrop: AspectRatioType = AspectRatioType.FEED_4_5,
    val activeRatioFilter: AspectRatioType = AspectRatioType.FEED_4_5,
    val searchQuery: String = "",
    val isBold: Boolean = false,
    val textSizeScale: Float = 1.0f,
    val firstTitle: String = "YOUR HEADLINE",
    val secondTitle: String = "यहाँ आपकी हेडलाइन आएगी",
    val line1: String = "YOUR HEADLINE",
    val line2: String = "",
    val line3: String = "ताजा समाचार सबसे पहले...",
    val cityName: String = "LOCATION",
    val channelLogoTag: String = "YOUR LOGO",
    val tickerText: String = "(अधिकतम 3 लाइन में)",
    val customLogoUri: String = "",
    val customJacketUri: String = "",
    val customLogoVideoUri: String = "",
    val isOriginalAudioEnabled: Boolean = true,
    val originalVideoVolume: Float = 1.0f,
    val backgroundMusicVolume: Float = 0.5f,
    val easyVoiceoverEnabled: Boolean = false,
    val isVoiceoverRecording: Boolean = false,
    val voiceoverSeconds: Int = 0,
    val hasVoiceover: Boolean = false,
    val voiceoverVolume: Float = 1.0f,
    val selectedAudioTrack: AudioTrackItem? = null,
    val isAudioTrackPlaying: Boolean = false,
    val playingTrackId: String = "",
    val uploadedAudioTracks: List<AudioTrackItem> = emptyList(),
    val currentPlaybackSeconds: Int = 0,
    val isExporting: Boolean = false,
    val exportProgress: Float = 0f,
    val exportedProject: NewsProject? = null,
    val exportedVideoUri: Uri? = null,
    val showExportSuccessDialog: Boolean = false,
    val isAudioSheetOpen: Boolean = false,
    val isCropSheetOpen: Boolean = false,
    val isLogoSheetOpen: Boolean = false,
    val isAuthSheetOpen: Boolean = false,
    val isUploadTemplateSheetOpen: Boolean = false,
    val isEditVideoDialogOpen: Boolean = false,
    val userProfile: UserProfile = UserProfile(),
    val isExclusiveWatermark: Boolean = false,
    val activeEditorStepIndex: Int = 0,
    val videoZoomScale: Float = 1.0f,
    val videoOffsetX: Float = 0f,
    val videoOffsetY: Float = 0f,
    val videoStartTrimSec: Float = 0f,
    val videoEndTrimSec: Float = 0f,
    val mediaClips: List<MediaClipItem> = emptyList(),
    val selectedClipIndex: Int = 0,
    val headlineLineMode: HeadlineLineMode = HeadlineLineMode.THREE_LINES,
    val hindiFontOption: HindiFontOption = HindiFontOption.NOTO_SANS_DEVANAGARI,
    val headlineAlignment: HeadlineAlignment = HeadlineAlignment.CENTER,
    val highlightedWords: Set<String> = emptySet()
)

class NewsMakerViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow(NewsMakerUiState())
    val uiState: StateFlow<NewsMakerUiState> = _uiState.asStateFlow()

    private val audioEngine = AudioStudioEngine(application.applicationContext)
    private var playbackTimerJob: Job? = null
    private var voiceoverJob: Job? = null

    init {
        loadInitialSavedProjects()
    }

    private fun loadInitialSavedProjects() {
        val initialProjects = listOf(
            NewsProject(
                id = "saved_sample_1",
                templateId = "graphic_001",
                title = "PM Press Conference",
                firstTitle = "अर्थव्यवस्था पर मोदी की",
                secondTitle = "PRESS CONFERENCE",
                tickerText = "LIVE: देश की जीडीपी में 8.2% की ऐतिहासिक बढ़त, वित्त मंत्रालय ने दी जानकारी...",
                cityName = "भोपाल, मप्र",
                channelLogoTag = "IBC24",
                mediaUri = "",
                isVideo = false,
                aspectRatio = AspectRatioType.SHORTS_9_16
            ),
            NewsProject(
                id = "saved_sample_2",
                templateId = "graphic_001",
                title = "Election 2026 Big Debate",
                firstTitle = "बदल सकती है पलड़ा एक, 4 की चोट",
                secondTitle = "ELECTION 2026 MAHABHARAT",
                tickerText = "BREAKING: चुनाव आयोग ने जारी की नई गाइडलाइन्स...",
                cityName = "वाराणसी",
                channelLogoTag = "BANSAL NEWS",
                mediaUri = "",
                isVideo = true,
                aspectRatio = AspectRatioType.YOUTUBE_16_9
            )
        )
        _uiState.update { it.copy(savedProjects = initialProjects) }
    }

    fun selectTab(tab: NavigationTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    fun selectCategory(category: TemplateCategory) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun selectTemplate(template: NewsTemplate) {
        _uiState.update {
            it.copy(
                selectedTemplate = template,
                line1 = template.line1,
                line2 = template.line2,
                line3 = template.line3,
                firstTitle = template.defaultFirstTitle,
                secondTitle = template.defaultSecondTitle,
                cityName = template.defaultCity,
                tickerText = template.defaultTicker,
                currentAspectCrop = template.aspectRatio
            )
        }
    }

    fun updateLine1(line: String) { _uiState.update { it.copy(line1 = line) } }
    fun updateLine2(line: String) { _uiState.update { it.copy(line2 = line) } }
    fun updateLine3(line: String) { _uiState.update { it.copy(line3 = line) } }
    fun updateFirstTitle(title: String) { _uiState.update { it.copy(firstTitle = title) } }
    fun updateSecondTitle(title: String) { _uiState.update { it.copy(secondTitle = title) } }
    fun updateTickerText(ticker: String) { _uiState.update { it.copy(tickerText = ticker) } }
    fun updateCityName(city: String) { _uiState.update { it.copy(cityName = city) } }
    fun updateChannelLogoTag(logoTag: String) { _uiState.update { it.copy(channelLogoTag = logoTag) } }

    fun setHeadlineLineMode(mode: HeadlineLineMode) { _uiState.update { it.copy(headlineLineMode = mode) } }
    fun setHindiFontOption(font: HindiFontOption) { _uiState.update { it.copy(hindiFontOption = font) } }
    fun setHeadlineAlignment(alignment: HeadlineAlignment) { _uiState.update { it.copy(headlineAlignment = alignment) } }

    fun toggleWordHighlight(word: String) {
        _uiState.update { state ->
            val set = state.highlightedWords.toMutableSet()
            if (set.contains(word)) set.remove(word) else set.add(word)
            state.copy(highlightedWords = set)
        }
    }

    fun autoBalanceInto3Lines() {
        val combined = "${_uiState.value.line1} ${_uiState.value.line2} ${_uiState.value.line3}".trim()
        val words = combined.split(" ").filter { it.isNotBlank() }
        if (words.size >= 3) {
            val chunk = words.size / 3
            _uiState.update {
                it.copy(
                    line1 = words.take(chunk).joinToString(" "),
                    line2 = words.drop(chunk).take(chunk).joinToString(" "),
                    line3 = words.drop(chunk * 2).joinToString(" ")
                )
            }
        }
    }

    fun setCustomJacket(uri: String) { _uiState.update { it.copy(customJacketUri = uri) } }
    fun setCustomLogo(uri: String) { _uiState.update { it.copy(customLogoUri = uri) } }

    fun setMediaUri(uri: Uri?, isVideo: Boolean) {
        _uiState.update { it.copy(mediaUri = uri, isVideo = isVideo) }
    }

    fun toggleMediaPlayback() {
        _uiState.update { it.copy(isMediaPlaying = !it.isMediaPlaying) }
    }

    fun adjustTextSize(increment: Boolean) {
        _uiState.update {
            val delta = if (increment) 0.1f else -0.1f
            it.copy(textSizeScale = (it.textSizeScale + delta).coerceIn(0.6f, 1.8f))
        }
    }

    fun toggleBold() {
        _uiState.update { it.copy(isBold = !it.isBold) }
    }

    fun setAspectCrop(ratio: AspectRatioType) {
        _uiState.update { it.copy(currentAspectCrop = ratio) }
    }

    fun toggleOriginalAudio() {
        _uiState.update { it.copy(isOriginalAudioEnabled = !it.isOriginalAudioEnabled) }
    }

    fun setOriginalVideoVolume(volume: Float) {
        _uiState.update { it.copy(originalVideoVolume = volume) }
    }

    fun setBackgroundMusicVolume(volume: Float) {
        _uiState.update { it.copy(backgroundMusicVolume = volume) }
    }

    fun setEasyVoiceoverEnabled(enabled: Boolean) {
        _uiState.update { it.copy(easyVoiceoverEnabled = enabled) }
    }

    fun toggleEasyVoiceover() {
        _uiState.update { it.copy(easyVoiceoverEnabled = !it.easyVoiceoverEnabled) }
    }

    fun updateCustomLogoUri(uri: String) { _uiState.update { it.copy(customLogoUri = uri) } }
    fun updateCustomLogoVideoUri(uri: String) { _uiState.update { it.copy(customLogoVideoUri = uri) } }
    fun setCustomLogoVideoUri(uri: String) { _uiState.update { it.copy(customLogoVideoUri = uri) } }

    fun openEditVideoDialog(open: Boolean, videoUri: Uri? = null) {
        _uiState.update { it.copy(isEditVideoDialogOpen = open, editingVideoUri = videoUri ?: it.mediaUri) }
    }

    fun applyVideoEdit(
        cropPreset: String,
        zoomScale: Float,
        offsetX: Float,
        offsetY: Float,
        startTrimSec: Float,
        endTrimSec: Float,
        videoVolume: Float,
        musicVolume: Float,
        chosenMusic: AudioTrackItem?
    ) {
        _uiState.update {
            it.copy(
                videoZoomScale = zoomScale,
                videoOffsetX = offsetX,
                videoOffsetY = offsetY,
                videoStartTrimSec = startTrimSec,
                videoEndTrimSec = endTrimSec,
                originalVideoVolume = videoVolume,
                backgroundMusicVolume = musicVolume,
                selectedAudioTrack = chosenMusic,
                isEditVideoDialogOpen = false
            )
        }
    }

    fun previewAudioTrack(track: AudioTrackItem) {
        audioEngine.playBroadcastTheme(track.id)
        _uiState.update { it.copy(isAudioTrackPlaying = true, playingTrackId = track.id) }
    }

    fun applyAudioTrack(track: AudioTrackItem) {
        _uiState.update { it.copy(selectedAudioTrack = track, isAudioSheetOpen = false) }
    }

    fun removeAudioTrack() {
        audioEngine.stopPlayback()
        _uiState.update { it.copy(selectedAudioTrack = null, isAudioTrackPlaying = false, playingTrackId = "") }
    }

    fun startVoiceoverRecording() {
        voiceoverJob?.cancel()
        _uiState.update { it.copy(isVoiceoverRecording = true, voiceoverSeconds = 0) }
        voiceoverJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { it.copy(voiceoverSeconds = it.voiceoverSeconds + 1) }
            }
        }
    }

    fun stopVoiceoverRecording() {
        voiceoverJob?.cancel()
        _uiState.update { it.copy(isVoiceoverRecording = false, hasVoiceover = true) }
    }

    fun openAudioSheet(open: Boolean) { _uiState.update { it.copy(isAudioSheetOpen = open) } }
    fun openCropSheet(open: Boolean) { _uiState.update { it.copy(isCropSheetOpen = open) } }
    fun openLogoSheet(open: Boolean) { _uiState.update { it.copy(isLogoSheetOpen = open) } }
    fun openAuthSheet(open: Boolean) { _uiState.update { it.copy(isAuthSheetOpen = open) } }
    fun openUploadTemplateSheet(open: Boolean) { _uiState.update { it.copy(isUploadTemplateSheetOpen = open) } }

    fun startExport() {
        _uiState.update { it.copy(isExporting = true, exportProgress = 0f) }
        viewModelScope.launch {
            val params = NewsVideoRenderer.RenderParams(
                mediaUri = _uiState.value.mediaUri ?: Uri.EMPTY,
                isVideo = _uiState.value.isVideo,
                aspectRatio = _uiState.value.currentAspectCrop,
                firstTitle = _uiState.value.firstTitle,
                secondTitle = _uiState.value.secondTitle,
                line1 = _uiState.value.line1,
                line2 = _uiState.value.line2,
                line3 = _uiState.value.line3,
                cityName = _uiState.value.cityName,
                channelLogoTag = _uiState.value.channelLogoTag,
                tickerText = _uiState.value.tickerText
            )
            val outputUri = NewsVideoRenderer.renderAndExportVideo(
                context = getApplication<Application>().applicationContext,
                params = params,
                onProgress = { progress ->
                    _uiState.update { it.copy(exportProgress = progress) }
                }
            )
            val newProject = NewsProject(
                id = UUID.randomUUID().toString(),
                templateId = _uiState.value.selectedTemplate.id,
                title = _uiState.value.firstTitle.ifBlank { "New Export" },
                firstTitle = _uiState.value.firstTitle,
                secondTitle = _uiState.value.secondTitle,
                tickerText = _uiState.value.tickerText,
                cityName = _uiState.value.cityName,
                channelLogoTag = _uiState.value.channelLogoTag,
                mediaUri = outputUri?.toString() ?: "",
                isVideo = _uiState.value.isVideo,
                aspectRatio = _uiState.value.currentAspectCrop
            )
            _uiState.update {
                it.copy(
                    isExporting = false,
                    exportProgress = 1.0f,
                    exportedProject = newProject,
                    exportedVideoUri = outputUri,
                    showExportSuccessDialog = true,
                    savedProjects = listOf(newProject) + it.savedProjects
                )
            }
        }
    }

    fun dismissExportDialog() {
        _uiState.update { it.copy(showExportSuccessDialog = false) }
    }

    fun deleteProject(projectId: String) {
        _uiState.update { state ->
            state.copy(savedProjects = state.savedProjects.filter { it.id != projectId })
        }
    }

    fun setSearchQuery(query: String) { _uiState.update { it.copy(searchQuery = query) } }
    fun setRatioFilter(ratio: AspectRatioType) { _uiState.update { it.copy(activeRatioFilter = ratio) } }
    fun saveUserProfile(profile: UserProfile) { _uiState.update { it.copy(userProfile = profile, isAuthSheetOpen = false) } }

    fun toggleUserRole() {
        _uiState.update { state ->
            val nextRole = if (state.userProfile.role == UserRole.ADMIN) UserRole.REPORTER else UserRole.ADMIN
            state.copy(userProfile = state.userProfile.copy(role = nextRole))
        }
    }

    fun toggleExclusiveWatermark() {
        _uiState.update { it.copy(isExclusiveWatermark = !it.isExclusiveWatermark) }
    }

    fun uploadTemplate(template: NewsTemplate) {
        TemplateRepository.registerTemplate(template)
        _uiState.update {
            it.copy(
                customTemplates = listOf(template) + it.customTemplates,
                isUploadTemplateSheetOpen = false
            )
        }
    }

    fun setActiveEditorStep(step: Int) { _uiState.update { it.copy(activeEditorStepIndex = step) } }
    fun setVideoOffsetY(offset: Float) { _uiState.update { it.copy(videoOffsetY = offset) } }
    fun setVideoOffsetX(offset: Float) { _uiState.update { it.copy(videoOffsetX = offset) } }
    fun setVideoZoomScale(scale: Float) { _uiState.update { it.copy(videoZoomScale = scale) } }
    fun resetVideoPanZoom() { _uiState.update { it.copy(videoZoomScale = 1.0f, videoOffsetX = 0f, videoOffsetY = 0f) } }

    fun addMediaClips(newClips: List<MediaClipItem>) {
        _uiState.update { it.copy(mediaClips = it.mediaClips + newClips) }
    }

    fun removeMediaClip(clipId: String) {
        _uiState.update { it.copy(mediaClips = it.mediaClips.filter { c -> c.id != clipId }) }
    }

    fun selectClip(index: Int) { _uiState.update { it.copy(selectedClipIndex = index) } }

    fun updateClipTrim(clipId: String, startTrim: Float, endTrim: Float) {
        _uiState.update { state ->
            state.copy(mediaClips = state.mediaClips.map {
                if (it.id == clipId) it.copy(startTrimSeconds = startTrim, endTrimSeconds = endTrim) else it
            })
        }
    }

    fun setCombinedHeadline(text: String) {
        _uiState.update { it.copy(firstTitle = text, line1 = text) }
    }

    fun uploadCustomAudioTrack(item: AudioTrackItem) {
        _uiState.update { it.copy(uploadedAudioTracks = listOf(item) + it.uploadedAudioTracks) }
    }

    fun uploadMultipleAudioTracks(items: List<AudioTrackItem>) {
        _uiState.update { it.copy(uploadedAudioTracks = items + it.uploadedAudioTracks) }
    }

    fun loginWithPassword(role: UserRole, enteredPass: String): Boolean {
        if (enteredPass == "1234" || enteredPass == "admin") {
            _uiState.update { it.copy(userProfile = UserProfile("admin_user", role, true, "Admin Desk")) }
            return true
        }
        return false
    }

    override fun onCleared() {
        super.onCleared()
        audioEngine.stopPlayback()
        playbackTimerJob?.cancel()
        voiceoverJob?.cancel()
    }
}
