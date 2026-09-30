package com.example.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.AudioStudioEngine
import com.example.model.AspectRatioType
import com.example.model.AudioRepository
import com.example.model.AudioTrackItem
import com.example.model.HeadlineAlignment
import com.example.model.HeadlineLineMode
import com.example.model.HindiFontOption
import com.example.model.MediaClipItem
import com.example.model.NewsProject
import com.example.model.NewsTemplate
import com.example.model.TemplateCategory
import com.example.model.TemplateRepository
import com.example.model.TemplateStyle
import com.example.model.UserProfile
import com.example.model.UserRole
import com.example.util.NewsVideoRenderer
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class NewsMakerUiState(
    val currentTab: NavigationTab = NavigationTab.TEMPLATES,
    val selectedCategory: TemplateCategory? = null,
    val selectedTemplate: NewsTemplate = TemplateRepository.templates.firstOrNull() ?: TemplateRepository.defaultPlaceholderTemplate,
    val customTemplates: List<NewsTemplate> = emptyList(),

    // User Profile & Authentication (Admin vs Reporter)
    val userProfile: UserProfile = UserProfile(
        username = "rajesh_news",
        reporterName = "Rajesh Sharma",
        role = UserRole.ADMIN,
        isLoggedIn = true
    ),
    val isAuthSheetOpen: Boolean = false,
    val isUploadTemplateSheetOpen: Boolean = false,

    // Editor text fields (Only YOUR HEADLINE - Subtitle ignored)
    val firstTitle: String = "YOUR HEADLINE",
    val secondTitle: String = "",
    val tickerText: String = "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर...",
    val cityName: String = "LOCATION",
    val channelLogoTag: String = "YOUR LOGO",
    
    // Exclusive Watermark toggle
    val isExclusiveWatermark: Boolean = false,

    // Regular News 3-Line & Formatting Controls
    val line1: String = "रात 1 बजे कार में मिले मिठाई",
    val line2: String = "के डिब्बे, अंदर निकले ₹500",
    val line3: String = "₹500 के नोट; वीडियो वायरल",
    val headlineLineMode: HeadlineLineMode = HeadlineLineMode.THREE_LINE,
    val hindiFontOption: HindiFontOption = HindiFontOption.HIND_BOLD,
    val headlineAlignment: HeadlineAlignment = HeadlineAlignment.CENTER,
    val highlightedWords: Set<String> = setOf("₹500", "मिठाई", "वायरल"),

    // Admin Custom Frame/Jacket & Custom Channel Logo
    val customJacketUri: String? = null,
    val customLogoUri: String? = null,
    
    // Text formatting
    val textSizeScale: Float = 1.0f,
    val isBold: Boolean = true,
    
    // Media & video
    val mediaUri: Uri? = null,
    val isVideo: Boolean = false,
    val isMediaPlaying: Boolean = true,
    val currentPlaybackSeconds: Int = 0,
    val currentAspectCrop: AspectRatioType = AspectRatioType.SHORTS_9_16,
    
    // Video Pan & Zoom controls (Move video up/down, zoom in/out)
    val videoOffsetY: Float = 0f,
    val videoOffsetX: Float = 0f,
    val videoZoomScale: Float = 1.0f,
    
    // Multi-video clips & sequence
    val mediaClips: List<MediaClipItem> = emptyList(),
    val selectedClipIndex: Int = 0,
    
    // Studio step index (0=Media & Clips, 1=Headline, 2=Location, 3=Audio, 4=Watermark, 5=Admin Graphics)
    val activeEditorStepIndex: Int = 0,
    
    // Admin Uploaded Copyright-free Music tracks
    val uploadedAudioTracks: List<AudioTrackItem> = emptyList(),
    
    // Audio settings & volume levels
    val isOriginalAudioEnabled: Boolean = true,
    val originalVideoVolume: Float = 1.0f,
    val backgroundMusicVolume: Float = 0.6f,
    val voiceoverVolume: Float = 1.0f,
    val easyVoiceoverEnabled: Boolean = true,
    val selectedAudioTrack: AudioTrackItem? = null,
    val isAudioTrackPlaying: Boolean = false,
    val playingTrackId: String? = null,
    val isVoiceoverRecording: Boolean = false,
    val voiceoverSeconds: Int = 0,
    val hasVoiceover: Boolean = false,
    
    // One-time Logo video / gif
    val customLogoVideoUri: String? = null,
    
    // Dedicated Video Edit & Trim dialog state
    val isEditVideoDialogOpen: Boolean = false,
    val editingVideoUri: Uri? = null,
    val videoStartTrimSec: Float = 0f,
    val videoEndTrimSec: Float = 60f,
    
    // UI Sheets & dialogs
    val isAudioSheetOpen: Boolean = false,
    val isCropSheetOpen: Boolean = false,
    val isLogoSheetOpen: Boolean = false,
    val isExporting: Boolean = false,
    val exportProgress: Float = 0f,
    val showExportSuccessDialog: Boolean = false,
    val exportedProject: NewsProject? = null,
    val exportedVideoUri: Uri? = null,
    
    // Saved projects (in-memory session list, no heavy video blob in DB)
    val savedProjects: List<NewsProject> = emptyList(),
    
    // Filter / search
    val searchQuery: String = "",
    val activeRatioFilter: AspectRatioType? = null
) {
    val allTemplates: List<NewsTemplate>
        get() = customTemplates + TemplateRepository.templates

    val allAudioTracks: List<AudioTrackItem>
        get() = uploadedAudioTracks + AudioRepository.tracks

    val combinedHeadline: String
        get() = if (line1.isNotBlank() || line2.isNotBlank() || line3.isNotBlank()) {
            listOf(line1, line2, line3).filter { it.isNotBlank() }.joinToString("\n")
        } else {
            firstTitle
        }
}

enum class NavigationTab {
    TEMPLATES,
    STUDIO,
    SAVED,
    CATEGORIES
}

class NewsMakerViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(NewsMakerUiState())
    val uiState: StateFlow<NewsMakerUiState> = _uiState.asStateFlow()

    private val audioEngine = AudioStudioEngine(application.applicationContext)
    private var voiceoverJob: Job? = null
    private var playbackTimerJob: Job? = null

    init {
        // Start simulated live playback timer
        startPlaybackTimer()
        
        // Populate sample saved projects for quick demonstration
        loadInitialSavedProjects()
    }

    private fun loadInitialSavedProjects() {
        val initialProjects = listOf(
            NewsProject(
                id = "saved_sample_1",
                templateId = "shorts_1",
                title = "PM Press Conference",
                firstTitle = "अर्थव्यवस्था पर मोदी की",
                secondTitle = "PRESS CONFERENCE",
                tickerText = "LIVE: देश की जीडीपी में 8.2% की ऐतिहासिक बढ़त, वित्त मंत्रालय ने दी जानकारी...",
                cityName = "भोपाल, मप्र",
                channelLogoTag = "IBC24",
                aspectRatio = AspectRatioType.SHORTS_9_16,
                isOriginalAudioEnabled = true
            ),
            NewsProject(
                id = "saved_sample_2",
                templateId = "youtube_1",
                title = "Election 2026 Big Debate",
                firstTitle = "बदल सकती है पलड़ा एक, 4 की चोट",
                secondTitle = "ELECTION 2026 MAHABHARAT",
                tickerText = "BREAKING: चुनाव आयोग ने जारी की नई गाइडलाइन्स...",
                cityName = "वाराणसी",
                channelLogoTag = "BANSAL NEWS",
                aspectRatio = AspectRatioType.YOUTUBE_16_9,
                isOriginalAudioEnabled = false
            )
        )
        _uiState.update { it.copy(savedProjects = initialProjects) }
    }

    private fun startPlaybackTimer() {
        playbackTimerJob?.cancel()
        playbackTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                if (_uiState.value.isMediaPlaying) {
                    _uiState.update { it.copy(currentPlaybackSeconds = (it.currentPlaybackSeconds + 1) % 60) }
                }
            }
        }
    }

    fun selectTab(tab: NavigationTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    fun selectCategory(category: TemplateCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun selectTemplate(template: NewsTemplate) {
        _uiState.update {
            val l1 = if (template.line1.isNotBlank()) template.line1 else it.line1
            val l2 = if (template.line2.isNotBlank()) template.line2 else it.line2
            val l3 = if (template.line3.isNotBlank()) template.line3 else it.line3
            it.copy(
                selectedTemplate = template,
                firstTitle = template.defaultFirstTitle,
                secondTitle = template.defaultSecondTitle,
                tickerText = template.defaultTicker,
                cityName = template.defaultCity,
                channelLogoTag = template.channelLogoTag,
                currentAspectCrop = template.aspectRatio,
                line1 = l1,
                line2 = l2,
                line3 = l3,
                customJacketUri = template.customJacketUri ?: it.customJacketUri,
                customLogoUri = template.customLogoUri ?: it.customLogoUri,
                currentTab = NavigationTab.STUDIO
            )
        }
    }

    fun updateLine1(line: String) {
        _uiState.update { it.copy(line1 = line) }
    }

    fun updateLine2(line: String) {
        _uiState.update { it.copy(line2 = line) }
    }

    fun updateLine3(line: String) {
        _uiState.update { it.copy(line3 = line) }
    }

    fun setHeadlineLineMode(mode: HeadlineLineMode) {
        _uiState.update { it.copy(headlineLineMode = mode) }
    }

    fun setHindiFontOption(font: HindiFontOption) {
        _uiState.update { it.copy(hindiFontOption = font) }
    }

    fun setHeadlineAlignment(alignment: HeadlineAlignment) {
        _uiState.update { it.copy(headlineAlignment = alignment) }
    }

    fun toggleWordHighlight(word: String) {
        val clean = word.trim().removeSurrounding("\"", "\"").removeSurrounding("'", "'").removeSuffix(";").removeSuffix(",").removeSuffix(".")
        _uiState.update {
            val current = it.highlightedWords
            val next = if (current.any { w -> w.equals(clean, ignoreCase = true) }) {
                current.filterNot { w -> w.equals(clean, ignoreCase = true) }.toSet()
            } else {
                current + clean
            }
            it.copy(highlightedWords = next)
        }
    }

    fun autoBalanceInto3Lines() {
        val combined = "${_uiState.value.line1} ${_uiState.value.line2} ${_uiState.value.line3}".trim()
        val words = combined.split("\\s+".toRegex()).filter { it.isNotBlank() }
        if (words.size >= 3) {
            val count = words.size
            val part1 = (count + 2) / 3
            val part2 = (count - part1 + 1) / 2
            val l1 = words.take(part1).joinToString(" ")
            val l2 = words.drop(part1).take(part2).joinToString(" ")
            val l3 = words.drop(part1 + part2).joinToString(" ")
            _uiState.update { it.copy(line1 = l1, line2 = l2, line3 = l3) }
        }
    }

    fun setCustomJacket(uri: String?) {
        _uiState.update {
            it.copy(
                customJacketUri = uri,
                selectedTemplate = it.selectedTemplate.copy(customJacketUri = uri)
            )
        }
    }

    fun setCustomLogo(uri: String?) {
        _uiState.update {
            it.copy(
                customLogoUri = uri,
                selectedTemplate = it.selectedTemplate.copy(customLogoUri = uri)
            )
        }
    }

    fun updateFirstTitle(title: String) {
        _uiState.update { it.copy(firstTitle = title) }
    }

    fun updateSecondTitle(title: String) {
        _uiState.update { it.copy(secondTitle = title) }
    }

    fun updateTickerText(ticker: String) {
        _uiState.update { it.copy(tickerText = ticker) }
    }

    fun updateCityName(city: String) {
        _uiState.update { it.copy(cityName = city) }
    }

    fun updateChannelLogoTag(logoTag: String) {
        _uiState.update { it.copy(channelLogoTag = logoTag) }
    }

    fun setMediaUri(uri: Uri?, isVideo: Boolean) {
        _uiState.update {
            it.copy(
                mediaUri = uri,
                isVideo = isVideo,
                currentPlaybackSeconds = 0
            )
        }
    }

    fun toggleMediaPlayback() {
        _uiState.update { it.copy(isMediaPlaying = !it.isMediaPlaying) }
    }

    fun adjustTextSize(increment: Boolean) {
        _uiState.update {
            val newScale = if (increment) {
                (it.textSizeScale + 0.1f).coerceAtMost(1.5f)
            } else {
                (it.textSizeScale - 0.1f).coerceAtLeast(0.7f)
            }
            it.copy(textSizeScale = newScale)
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
        _uiState.update { it.copy(originalVideoVolume = volume, isOriginalAudioEnabled = volume > 0.05f) }
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

    fun updateCustomLogoUri(uri: String?) {
        _uiState.update { it.copy(customLogoUri = uri) }
    }

    fun updateCustomLogoVideoUri(uri: String?) {
        _uiState.update { it.copy(customLogoVideoUri = uri) }
    }

    fun setCustomLogoVideoUri(uri: String?) {
        _uiState.update { it.copy(customLogoVideoUri = uri) }
    }

    fun openEditVideoDialog(open: Boolean, videoUri: Uri? = null) {
        _uiState.update {
            it.copy(
                isEditVideoDialogOpen = open,
                editingVideoUri = videoUri ?: it.mediaUri
            )
        }
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
        val cropType = when {
            cropPreset.contains("4:5") || cropPreset.contains("4_5") -> AspectRatioType.FEED_4_5
            cropPreset.contains("16:9") || cropPreset.contains("16_9") -> AspectRatioType.YOUTUBE_16_9
            cropPreset.contains("1:1") -> AspectRatioType.SQUARE_1_1
            else -> AspectRatioType.SHORTS_9_16
        }
        _uiState.update {
            it.copy(
                currentAspectCrop = cropType,
                videoZoomScale = zoomScale,
                videoOffsetX = offsetX,
                videoOffsetY = offsetY,
                videoStartTrimSec = startTrimSec,
                videoEndTrimSec = endTrimSec,
                originalVideoVolume = videoVolume,
                isOriginalAudioEnabled = videoVolume > 0.05f,
                backgroundMusicVolume = musicVolume,
                selectedAudioTrack = chosenMusic ?: it.selectedAudioTrack,
                isEditVideoDialogOpen = false
            )
        }
    }

    fun previewAudioTrack(track: AudioTrackItem) {
        val currentlyPlayingId = _uiState.value.playingTrackId
        if (currentlyPlayingId == track.id && _uiState.value.isAudioTrackPlaying) {
            audioEngine.stopPlayback()
            _uiState.update { it.copy(isAudioTrackPlaying = false, playingTrackId = null) }
        } else {
            audioEngine.playBroadcastTheme(track.id) {
                _uiState.update { it.copy(isAudioTrackPlaying = false, playingTrackId = null) }
            }
            _uiState.update { it.copy(isAudioTrackPlaying = true, playingTrackId = track.id) }
        }
    }

    fun applyAudioTrack(track: AudioTrackItem) {
        _uiState.update {
            it.copy(
                selectedAudioTrack = track,
                isAudioSheetOpen = false
            )
        }
    }

    fun removeAudioTrack() {
        audioEngine.stopPlayback()
        _uiState.update {
            it.copy(
                selectedAudioTrack = null,
                isAudioTrackPlaying = false,
                playingTrackId = null
            )
        }
    }

    fun startVoiceoverRecording() {
        _uiState.update { it.copy(isVoiceoverRecording = true, voiceoverSeconds = 0) }
        voiceoverJob?.cancel()
        voiceoverJob = viewModelScope.launch {
            while (_uiState.value.isVoiceoverRecording) {
                delay(1000)
                _uiState.update { it.copy(voiceoverSeconds = it.voiceoverSeconds + 1) }
            }
        }
    }

    fun stopVoiceoverRecording() {
        voiceoverJob?.cancel()
        voiceoverJob = null
        _uiState.update {
            it.copy(
                isVoiceoverRecording = false,
                hasVoiceover = true
            )
        }
    }

    fun openAudioSheet(open: Boolean) {
        if (!open) {
            audioEngine.stopPlayback()
            _uiState.update { it.copy(isAudioSheetOpen = false, isAudioTrackPlaying = false, playingTrackId = null) }
        } else {
            _uiState.update { it.copy(isAudioSheetOpen = true) }
        }
    }

    fun openCropSheet(open: Boolean) {
        _uiState.update { it.copy(isCropSheetOpen = open) }
    }

    fun openLogoSheet(open: Boolean) {
        _uiState.update { it.copy(isLogoSheetOpen = open) }
    }

    fun startExport() {
        val state = _uiState.value
        _uiState.update { it.copy(isExporting = true, exportProgress = 0.05f) }
        viewModelScope.launch {
            val params = NewsVideoRenderer.RenderParams(
                mediaUri = state.mediaUri,
                isVideo = state.isVideo,
                aspectRatio = state.currentAspectCrop,
                videoZoomScale = state.videoZoomScale,
                videoOffsetX = state.videoOffsetX,
                videoOffsetY = state.videoOffsetY,
                startTrimSec = state.videoStartTrimSec,
                endTrimSec = state.videoEndTrimSec,
                templateStyle = state.selectedTemplate.style,
                firstTitle = state.firstTitle,
                secondTitle = state.secondTitle,
                line1 = state.line1,
                line2 = state.line2,
                line3 = state.line3,
                lineMode = state.headlineLineMode,
                cityName = state.cityName,
                channelLogoTag = state.channelLogoTag,
                tickerText = state.tickerText,
                highlightedWords = state.highlightedWords,
                isExclusiveWatermark = state.isExclusiveWatermark,
                customLogoUri = state.customLogoUri,
                customJacketUri = state.customJacketUri,
                textSizeScale = state.textSizeScale
            )

            val savedUri = NewsVideoRenderer.renderAndExportVideo(
                context = getApplication(),
                params = params,
                onProgress = { progress ->
                    _uiState.update { it.copy(exportProgress = progress) }
                }
            )

            val project = NewsProject(
                templateId = state.selectedTemplate.id,
                title = state.secondTitle.ifEmpty { state.firstTitle },
                firstTitle = state.firstTitle,
                secondTitle = state.secondTitle,
                tickerText = state.tickerText,
                cityName = state.cityName,
                channelLogoTag = state.channelLogoTag,
                mediaUri = savedUri?.toString() ?: state.mediaUri?.toString(),
                isVideo = true,
                selectedAudioTrackId = state.selectedAudioTrack?.id,
                isOriginalAudioEnabled = state.isOriginalAudioEnabled,
                voiceoverRecorded = state.hasVoiceover,
                aspectRatio = state.currentAspectCrop
            )

            _uiState.update {
                it.copy(
                    isExporting = false,
                    showExportSuccessDialog = true,
                    exportedProject = project,
                    exportedVideoUri = savedUri,
                    savedProjects = listOf(project) + it.savedProjects
                )
            }
        }
    }

    fun dismissExportDialog() {
        _uiState.update { it.copy(showExportSuccessDialog = false) }
    }

    fun deleteProject(projectId: String) {
        _uiState.update {
            it.copy(savedProjects = it.savedProjects.filter { p -> p.id != projectId })
        }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun setRatioFilter(ratio: AspectRatioType?) {
        _uiState.update { it.copy(activeRatioFilter = ratio) }
    }

    // Role & Profile Management
    fun openAuthSheet(open: Boolean) {
        _uiState.update { it.copy(isAuthSheetOpen = open) }
    }

    fun saveUserProfile(profile: UserProfile) {
        _uiState.update { it.copy(userProfile = profile) }
    }

    fun toggleUserRole() {
        val newRole = if (_uiState.value.userProfile.role == UserRole.ADMIN) UserRole.REPORTER else UserRole.ADMIN
        val newName = if (newRole == UserRole.ADMIN) "Rajesh Sharma" else "Vikram Singh"
        _uiState.update {
            it.copy(
                userProfile = it.userProfile.copy(
                    role = newRole,
                    reporterName = newName
                )
            )
        }
    }

    // Exclusive Watermark toggle
    fun toggleExclusiveWatermark() {
        _uiState.update { it.copy(isExclusiveWatermark = !it.isExclusiveWatermark) }
    }

    // Admin Template Upload
    fun openUploadTemplateSheet(open: Boolean) {
        _uiState.update { it.copy(isUploadTemplateSheetOpen = open) }
    }

    fun uploadTemplate(template: NewsTemplate) {
        _uiState.update {
            it.copy(
                customTemplates = listOf(template) + it.customTemplates,
                isUploadTemplateSheetOpen = false
            )
        }
    }

    // Studio Step Navigation
    fun setActiveEditorStep(step: Int) {
        _uiState.update { it.copy(activeEditorStepIndex = step) }
    }

    // Video Pan & Zoom
    fun setVideoOffsetY(offset: Float) {
        _uiState.update { it.copy(videoOffsetY = offset.coerceIn(-300f, 300f)) }
    }

    fun setVideoOffsetX(offset: Float) {
        _uiState.update { it.copy(videoOffsetX = offset.coerceIn(-300f, 300f)) }
    }

    fun setVideoZoomScale(scale: Float) {
        _uiState.update { it.copy(videoZoomScale = scale.coerceIn(0.5f, 3.0f)) }
    }

    fun resetVideoPanZoom() {
        _uiState.update { it.copy(videoOffsetY = 0f, videoOffsetX = 0f, videoZoomScale = 1.0f) }
    }

    // Multi-clip Management
    fun addMediaClips(newClips: List<MediaClipItem>) {
        _uiState.update {
            val updated = it.mediaClips + newClips
            val currentUri = it.mediaUri ?: newClips.firstOrNull()?.uri
            val isVid = if (it.mediaUri == null) newClips.firstOrNull()?.isVideo ?: false else it.isVideo
            it.copy(
                mediaClips = updated,
                mediaUri = currentUri,
                isVideo = isVid
            )
        }
    }

    fun removeMediaClip(clipId: String) {
        _uiState.update {
            val remaining = it.mediaClips.filter { c -> c.id != clipId }
            val nextIndex = it.selectedClipIndex.coerceAtMost((remaining.size - 1).coerceAtLeast(0))
            val activeClip = remaining.getOrNull(nextIndex)
            it.copy(
                mediaClips = remaining,
                selectedClipIndex = nextIndex,
                mediaUri = activeClip?.uri ?: if (remaining.isEmpty()) null else it.mediaUri,
                isVideo = activeClip?.isVideo ?: it.isVideo
            )
        }
    }

    fun selectClip(index: Int) {
        val clip = _uiState.value.mediaClips.getOrNull(index) ?: return
        _uiState.update {
            it.copy(
                selectedClipIndex = index,
                mediaUri = clip.uri,
                isVideo = clip.isVideo
            )
        }
    }

    fun updateClipTrim(clipId: String, startTrim: Float, endTrim: Float) {
        _uiState.update { state ->
            val updated = state.mediaClips.map { clip ->
                if (clip.id == clipId) {
                    clip.copy(startTrimSeconds = startTrim, endTrimSeconds = endTrim)
                } else clip
            }
            state.copy(mediaClips = updated)
        }
    }

    // Single Headline Input that updates 3-lines intelligently
    fun setCombinedHeadline(text: String) {
        val lines = text.split("\n")
        if (lines.size >= 3) {
            _uiState.update {
                it.copy(
                    line1 = lines[0].trim(),
                    line2 = lines[1].trim(),
                    line3 = lines.subList(2, lines.size).joinToString(" ").trim(),
                    firstTitle = text
                )
            }
        } else if (lines.size == 2) {
            _uiState.update {
                it.copy(
                    line1 = lines[0].trim(),
                    line2 = lines[1].trim(),
                    line3 = "",
                    firstTitle = text
                )
            }
        } else {
            val words = text.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
            if (words.size >= 4) {
                val count = words.size
                val part1 = (count + 2) / 3
                val part2 = (count - part1 + 1) / 2
                val l1 = words.take(part1).joinToString(" ")
                val l2 = words.drop(part1).take(part2).joinToString(" ")
                val l3 = words.drop(part1 + part2).joinToString(" ")
                _uiState.update {
                    it.copy(line1 = l1, line2 = l2, line3 = l3, firstTitle = text)
                }
            } else {
                _uiState.update {
                    it.copy(line1 = text, line2 = "", line3 = "", firstTitle = text)
                }
            }
        }
    }

    // Admin Uploaded Copyright-free Music
    fun uploadCustomAudioTrack(item: AudioTrackItem) {
        _uiState.update {
            it.copy(uploadedAudioTracks = listOf(item) + it.uploadedAudioTracks)
        }
    }

    fun uploadMultipleAudioTracks(items: List<AudioTrackItem>) {
        _uiState.update {
            it.copy(uploadedAudioTracks = items + it.uploadedAudioTracks)
        }
    }

    // Password-based authentication for Admin & Reporter
    fun loginWithPassword(role: UserRole, enteredPass: String): Boolean {
        val profile = _uiState.value.userProfile
        val valid = profile.verifyPassword(role, enteredPass)
        if (valid) {
            val defaultName = if (role == UserRole.ADMIN) "Rajesh Sharma" else "Vikram Singh"
            _uiState.update {
                it.copy(
                    userProfile = it.userProfile.copy(
                        role = role,
                        reporterName = defaultName
                    ),
                    isAuthSheetOpen = false
                )
            }
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
