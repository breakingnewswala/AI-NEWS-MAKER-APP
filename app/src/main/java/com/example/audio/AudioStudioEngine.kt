package com.example.audio

import android.content.Context
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.util.Log

class AudioStudioEngine(private val context: Context) {
    private var mediaPlayer: MediaPlayer? = null
    private var toneGenerator: ToneGenerator? = null

    init {
        try {
            toneGenerator = ToneGenerator(3, 80)
        } catch (e: Exception) {
            Log.w("AudioStudioEngine", "ToneGenerator init error: ${e.message}")
        }
    }

    fun playBroadcastTheme(trackId: String, onCompletion: () -> Unit = {}) {
        stopPlayback()
        try {
            toneGenerator?.startTone(28, 600)
            onCompletion()
        } catch (e: Exception) {
            Log.w("AudioStudioEngine", "playBroadcastTheme error: ${e.message}")
            onCompletion()
        }
    }

    fun stopPlayback() {
        try {
            toneGenerator?.stopTone()
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (_: Exception) {
        }
    }
}
