# ProGuard / R8 rules for admin_app release builds

# Flutter plugin rules (recommended baseline)
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# realtimekit_ui / ktor references java.lang.management classes that are not
# available on Android. These are only used for desktop debug detection.
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.RuntimeMXBean
-dontwarn java.lang.management.**
-dontwarn io.ktor.util.debug.**

# Keep Crypto/SignatureUtil reflection-free
-keep class com.yagyaashram.lms.admin.** { *; }
