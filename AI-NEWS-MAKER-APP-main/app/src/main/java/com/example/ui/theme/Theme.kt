package com.example.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Amber400,
    onPrimary = Slate950,
    primaryContainer = NewsRedPrimary,
    onPrimaryContainer = Color.White,
    secondary = Amber500,
    onSecondary = Slate950,
    tertiary = NewsGold,
    onTertiary = Slate950,
    background = Slate950,
    onBackground = Slate200,
    surface = Slate900,
    onSurface = Color.White,
    surfaceVariant = Slate800,
    onSurfaceVariant = Slate400,
    outline = Slate800
)

private val LightColorScheme = DarkColorScheme

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
