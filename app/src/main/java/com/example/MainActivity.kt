package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import com.example.ui.screens.NewsroomScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.Slate950

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        MainNewsStudioApp()
      }
    }
  }
}

@Composable
fun MainNewsStudioApp() {
  val context = androidx.compose.ui.platform.LocalContext.current

  LaunchedEffect(Unit) {
    com.example.data.AuthManager.init(context)
  }

  Surface(
    modifier = Modifier.fillMaxSize(),
    color = Slate950
  ) {
    NewsroomScreen()
  }
}
