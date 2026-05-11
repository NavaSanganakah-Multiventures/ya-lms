# Ktor includes a JVM-only debugger detector that references java.lang.management APIs.
# Android does not provide these classes, and the detector is not needed at runtime,
# so suppress the R8 missing-class warning for release minification.
-dontwarn java.lang.management.**
