// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
  alias(libs.plugins.android.application) apply false
  alias(libs.plugins.kotlin.compose) apply false
  alias(libs.plugins.google.devtools.ksp) apply false
  alias(libs.plugins.roborazzi) apply false
  alias(libs.plugins.secrets) apply false
  alias(libs.plugins.google.services) apply false
}

val ensureWebServer = tasks.register("ensureWebServer") {
  val rootDirFile = layout.projectDirectory.asFile
  outputs.upToDateWhen { false }
  doLast {
    runCatching {
      val devScript = java.io.File(rootDirFile, "dev.cjs")
      if (devScript.exists() && System.getProperty("os.name").lowercase().contains("linux")) {
        val isListening = runCatching {
          java.net.Socket().use { socket ->
            socket.connect(java.net.InetSocketAddress("127.0.0.1", 3000), 200)
            true
          }
        }.getOrDefault(false)
        if (!isListening) {
          ProcessBuilder("sh", "-c", "nohup node dev.cjs > /tmp/web_dev.log 2>&1 < /dev/null &")
            .directory(rootDirFile)
            .start()
        }
      }
    }
  }
}

subprojects {
  tasks.configureEach {
    if (name == "preBuild") {
      dependsOn(ensureWebServer)
    }
  }
}

