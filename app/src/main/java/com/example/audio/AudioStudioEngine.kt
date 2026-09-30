package com.example.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.media.AudioManager
import android.util.Log

class AudioStudioEngine(private val context: Context) {

    private var mediaPlayer: MediaPlayer? = null
    private var toneGenerator: ToneGenerator? = null

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 80)
        } catch (e: Exception) {
            Log.w("AudioStudioEngine", "ToneGenerator init error: ${e.message}")
        }
    }

    fun playBroadcastTheme(trackId: String, onCompletion: () -> Unit) {
        stopPlayback()
        try {
            // Provide a pleasant studio tone beep sequence as standard fallback
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 600)
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
        } catch (_: Exception) {}
    }
}
