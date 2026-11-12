# Add project specific ProGuard rules here.
# Keep source file and line numbers for readable Play Console crash/ANR stack traces
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Preserve WebView @JavascriptInterface methods and AndroidBridge class
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.example.ui.screens.NewsStudioBridge {
    *;
}
-keepclassmembers class com.example.ui.screens.NewsStudioBridge {
    public *;
}

# Preserve Activity, Application, data models, and auth/repository classes
-keep class com.example.MainApplication { *; }
-keep class com.example.MainActivity { *; }
-keep class com.example.model.** { *; }
-keep class com.example.data.AuthUser { *; }

# Keep Jetpack Credential Manager & Google Identity Services classes
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn androidx.credentials.**
-dontwarn com.google.android.gms.**
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement

# Keep Firebase Firestore POJOs/data classes for serialization
-keepclassmembers class com.example.data.Firestore* { *; }
-keepclassmembers class * {
    @com.google.firebase.firestore.* <fields>;
    @com.google.firebase.firestore.* <methods>;
}
-keepattributes Signature


