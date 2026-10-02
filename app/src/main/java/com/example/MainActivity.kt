package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.zIndex
import com.example.ui.components.AppBottomBar
import com.example.ui.components.AppTab
import com.example.ui.components.AppTopBar
import com.example.ui.components.NotificationDialog
import com.example.ui.screens.*
import com.example.ui.theme.*

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    try {
      android.system.Os.setenv("MESA_LOG_FILE", "/dev/null", true)
      android.system.Os.setenv("MESA_DEBUG", "0", true)
      android.system.Os.setenv("MESA_SILENT", "1", true)
      android.system.Os.setenv("MESA_NO_ERROR", "1", true)
      android.system.Os.setenv("LIBGL_DEBUG", "quiet", true)
      android.system.Os.setenv("EGL_LOG_LEVEL", "fatal", true)
    } catch (_: Throwable) {}

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

  val isLoggedIn by com.example.data.AuthManager.isLoggedIn.collectAsState()
  val isOnboardingCompleted by com.example.data.AuthManager.isOnboardingCompleted.collectAsState()

  // App defaults strictly to HOME (होम) screen as expected by user
  var currentTab by remember { mutableStateOf(AppTab.HOME) }
  var showNotifications by remember { mutableStateOf(false) }
  var showAdminAddDialog by remember { mutableStateOf(false) }
  var showAdminConsole by remember { mutableStateOf(false) }
  var newsroomRefreshKey by remember { mutableStateOf(0) }
  var isStudioTopBarVisible by remember { mutableStateOf(true) }

  if (!isLoggedIn || !isOnboardingCompleted) {
    // 1. Primary Welcome & Login Screen
    PrimaryAuthWelcomeScreen(
      onLoginSuccess = {
        currentTab = AppTab.HOME
      }
    )
  } else if (showAdminConsole) {
    AdminConsoleScreen(
      onNavigateBack = { showAdminConsole = false },
      onOpenNewsroomWithProject = { _ ->
        showAdminConsole = false
        currentTab = AppTab.NEWSROOM
      }
    )
  } else {
    Scaffold(
      modifier = Modifier.fillMaxSize(),
      containerColor = Slate950,
      topBar = {
        AnimatedVisibility(
          visible = currentTab != AppTab.NEWSROOM,
          enter = expandVertically() + fadeIn(),
          exit = shrinkVertically() + fadeOut()
        ) {
          AppTopBar(
            currentTab = currentTab,
            onLogoutClick = {
              com.example.data.AuthManager.logout(context)
              android.widget.Toast.makeText(context, "लॉग आउट सफल", android.widget.Toast.LENGTH_SHORT).show()
            },
            onRefreshClick = {
              when (currentTab) {
                AppTab.NEWSROOM -> {
                  newsroomRefreshKey++
                }
                AppTab.HOME -> {
                  com.example.data.NewsRepository.refreshFeed()
                  android.widget.Toast.makeText(context, "होम रिफ्रेश हुआ", android.widget.Toast.LENGTH_SHORT).show()
                }
                AppTab.VIDEOS -> {
                  com.example.data.NewsRepository.refreshFeed()
                  android.widget.Toast.makeText(context, "वीडियो फ़ीड रिफ्रेश हुई", android.widget.Toast.LENGTH_SHORT).show()
                }
                AppTab.EPAPER -> {
                  com.example.data.NewsRepository.refreshFeed()
                  android.widget.Toast.makeText(context, "ई-पेपर संस्करण रिफ्रेश हुआ", android.widget.Toast.LENGTH_SHORT).show()
                }
                AppTab.PROFILE -> {
                  android.widget.Toast.makeText(context, "सेटिंग्स रिफ्रेश हुई", android.widget.Toast.LENGTH_SHORT).show()
                }
              }
            },
            onNotificationClick = { showNotifications = true },
            onAdminConsoleClick = { showAdminConsole = true },
            onSettingsClick = { currentTab = AppTab.PROFILE }
          )
        }
      },
      bottomBar = {
        AppBottomBar(
          currentTab = currentTab,
          onTabSelected = { tab ->
            currentTab = tab
          }
        )
      }
    ) { innerPadding ->
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Slate950)
          .padding(innerPadding)
      ) {
        // Tab screens (HOME, VIDEOS, EPAPER, PROFILE)
        if (currentTab != AppTab.NEWSROOM) {
          when (currentTab) {
            AppTab.HOME -> {
              HomeScreen(
                onMakeNewsClicked = { post ->
                  // Redirect to Newsroom with ready-to-use jacket
                  com.example.data.NewsRepository.setPendingGraphicNews(post)
                  currentTab = AppTab.NEWSROOM
                },
                onAdminAddPostClicked = {
                  showAdminAddDialog = true
                },
                onOpenAdminConsole = {
                  showAdminConsole = true
                }
              )
            }
            AppTab.VIDEOS -> {
              VideosScreen(
                onSendToVideoEditor = { video ->
                  com.example.data.NewsRepository.setPendingVideo(video)
                  currentTab = AppTab.NEWSROOM
                }
              )
            }
            AppTab.EPAPER -> {
              EPaperScreen()
            }
            AppTab.PROFILE -> {
              ProfileScreen(
                onNavigateToHome = {
                  currentTab = AppTab.HOME
                },
                onOpenAdminConsole = {
                  showAdminConsole = true
                },
                onNavigateToNewsroom = {
                  currentTab = AppTab.NEWSROOM
                },
                onLogout = {
                  com.example.data.AuthManager.logout(context)
                  android.widget.Toast.makeText(context, "लॉग आउट सफल", android.widget.Toast.LENGTH_SHORT).show()
                }
              )
            }
            else -> {}
          }
        }

        var hasVisitedNewsroom by remember { mutableStateOf(false) }
        if (currentTab == AppTab.NEWSROOM) {
          hasVisitedNewsroom = true
        }

        // Persistent Newsroom Studio Screen: Kept warm in memory once visited so switching to Studio is instant with ZERO blinking/reloading
        if (hasVisitedNewsroom) {
          Box(
            modifier = Modifier
              .fillMaxSize()
              .zIndex(if (currentTab == AppTab.NEWSROOM) 2f else -1f)
              .alpha(if (currentTab == AppTab.NEWSROOM) 1f else 0f)
          ) {
            NewsroomScreen(
              refreshTrigger = newsroomRefreshKey,
              isActive = currentTab == AppTab.NEWSROOM,
              onScrollChange = { isDown, scrollY ->
                if (isDown && scrollY > 20) {
                  isStudioTopBarVisible = false
                } else if (!isDown || scrollY <= 15) {
                  isStudioTopBarVisible = true
                }
              }
            )
          }
        }
      }
    }
  }

  // Top Bar Notification Dialog
  if (showNotifications) {
    NotificationDialog(
      onDismiss = { showNotifications = false }
    )
  }

  // Admin Quick Add Dialog
  if (showAdminAddDialog) {
    AddPostDialog(
      onDismiss = { showAdminAddDialog = false },
      onPostAdded = {
        showAdminAddDialog = false
      }
    )
  }
}
