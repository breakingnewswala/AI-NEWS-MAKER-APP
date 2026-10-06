package com.example

import android.content.Context
import android.os.Bundle
import android.system.Os
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.AuthManager
import com.example.data.NewsRepository
import com.example.ui.components.AppBottomBar
import com.example.ui.components.AppTab
import com.example.ui.components.AppTopBar
import com.example.ui.components.NotificationDialog
import com.example.ui.screens.*
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
<<<<<<< HEAD
  override fun onCreate(savedInstanceState: Bundle?) {
    MainApplication.configureGraphicsEnvironment()
=======
    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            Os.setenv("MESA_LOG_FILE", "/dev/null", true)
            Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
            Os.setenv("GALLIUM_DRIVER", "llvmpipe", true)
            Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
        } catch (_: Throwable) {
        }
>>>>>>> 7bc5501 (feat(studio): complete mobile graphic studio specification updates, primary nav sync, 4:5 ratio enforcement, draft auto-save and push)

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
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        AuthManager.init(context)
    }

    val isLoggedIn by AuthManager.isLoggedIn.collectAsStateWithLifecycle()
    var currentTab by remember { mutableStateOf(AppTab.HOME) }
    var showNotifications by remember { mutableStateOf(false) }
    var showAdminConsole by remember { mutableStateOf(false) }
    var newsroomRefreshKey by remember { mutableIntStateOf(0) }
    var isStudioTopBarVisible by remember { mutableStateOf(true) }

    // If not logged in, show Auth / Welcome screen
    if (!isLoggedIn) {
        PrimaryAuthWelcomeScreen(
            onLoginSuccess = {
                // Handled in AuthManager
            }
        )
        return
    }

    // If Admin Console is open, show full-screen admin
    if (showAdminConsole) {
        BackHandler {
            showAdminConsole = false
        }
        AdminConsoleScreen(
            onNavigateBack = { showAdminConsole = false },
            onOpenNewsroomWithProject = { project ->
                showAdminConsole = false
                currentTab = AppTab.NEWSROOM
            }
        )
        return
    }

    // Handle back button on sub-screens
    BackHandler(enabled = currentTab != AppTab.HOME) {
        currentTab = AppTab.HOME
    }

    Scaffold(
        topBar = {
            AnimatedVisibility(
                visible = if (currentTab == AppTab.NEWSROOM) isStudioTopBarVisible else true,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                AppTopBar(
                    currentTab = currentTab,
                    onRefreshClick = {
                        newsroomRefreshKey++
                        Toast.makeText(context, "रिफ्रेश हो रहा है...", Toast.LENGTH_SHORT).show()
                    },
                    onLogoutClick = {
                        AuthManager.logout(context)
                        Toast.makeText(context, "लॉग आउट सफल", Toast.LENGTH_SHORT).show()
                    },
                    onNotificationClick = {
                        showNotifications = true
                    },
                    onAdminConsoleClick = {
                        showAdminConsole = true
                    },
                    onSettingsClick = {
                        currentTab = AppTab.PROFILE
                    }
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
                .padding(innerPadding)
        ) {
            when (currentTab) {
                AppTab.HOME -> HomeScreen(
                    onMakeNewsClicked = { post ->
                        NewsRepository.setPendingGraphicNews(post)
                        currentTab = AppTab.STUDIO
                    },
                    onAdminAddPostClicked = {
                        // Handled via QuickLink in HomeScreen
                    },
                    onOpenAdminConsole = {
                        showAdminConsole = true
                    }
                )
                AppTab.VIDEOS -> VideosScreen(
                    onSendToVideoEditor = { video ->
                        NewsRepository.setPendingVideo(video)
                        currentTab = AppTab.STUDIO
                    }
                )
                AppTab.STUDIO -> NewsroomScreen(
                    refreshTrigger = newsroomRefreshKey,
                    isActive = currentTab == AppTab.STUDIO,
                    onScrollChange = { isDown, scrollY ->
                        if (isDown && scrollY > 20) {
                            isStudioTopBarVisible = false
                        } else if (!isDown || scrollY <= 15) {
                            isStudioTopBarVisible = true
                        }
                    }
                )
                AppTab.NEWSROOM -> EPaperScreen()
                AppTab.PROFILE -> ProfileScreen(
                    onNavigateToHome = { currentTab = AppTab.HOME },
                    onOpenAdminConsole = { showAdminConsole = true },
                    onNavigateToNewsroom = { currentTab = AppTab.STUDIO },
                    onLogout = {
                        AuthManager.logout(context)
                        Toast.makeText(context, "लॉग आउट सफल", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }

    if (showNotifications) {
        NotificationDialog(
            onDismiss = { showNotifications = false }
        )
    }
}
