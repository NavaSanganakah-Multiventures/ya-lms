package com.yagyaashram.lms

import android.Manifest
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.os.Build
import android.util.Rational
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val pipChannel = "com.yagyaashram.lms/picture_in_picture"
    private val permissionChannel = "com.yagyaashram.lms/permissions"
    private val integrityChannel = "com.yagyaashram.lms/play_integrity"
    private val CAMERA_MIC_REQUEST_CODE = 1001

    // PiP state
    private var pipActionsRegistered = false
    private var currentMicEnabled = true

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, pipChannel).setMethodCallHandler { call, result ->
            when (call.method) {
                "isSupported" -> result.success(isPictureInPictureSupported())
                "enter" -> result.success(enterPictureInPicture())
                "updateActions" -> {
                    currentMicEnabled = call.argument("micEnabled") ?: true
                    updatePipActions()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, permissionChannel).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestCameraAndMic" -> {
                    requestCameraAndMicPermissions(result)
                }
                "hasCameraAndMic" -> {
                    result.success(hasCameraAndMicPermissions())
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, integrityChannel).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestIntegrityToken" -> {
                    val nonce = call.argument<String>("nonce") ?: ""
                    val cloudProjectNumber = call.argument<String>("cloudProjectNumber") ?: ""
                    requestIntegrityToken(nonce, cloudProjectNumber, result)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun requestIntegrityToken(nonce: String, cloudProjectNumber: String, result: MethodChannel.Result) {
        val integrityManager = IntegrityManagerFactory.create(applicationContext)
        val tokenRequest = IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .setCloudProjectNumber(cloudProjectNumber.toLongOrNull() ?: 0L)
            .build()
        integrityManager.requestIntegrityToken(tokenRequest)
            .addOnSuccessListener { response -> result.success(response.token()) }
            .addOnFailureListener { exception ->
                result.error("INTEGRITY_ERROR", exception.message ?: "Unknown error", null)
            }
    }

    private fun hasCameraAndMicPermissions(): Boolean {
        val camera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        val audio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        return camera == PackageManager.PERMISSION_GRANTED && audio == PackageManager.PERMISSION_GRANTED
    }

    private fun requestCameraAndMicPermissions(result: MethodChannel.Result) {
        if (hasCameraAndMicPermissions()) {
            result.success(true)
            return
        }
        if (pendingPermissionResult != null) {
            result.success(false)
            return
        }
        pendingPermissionResult = result
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO),
            CAMERA_MIC_REQUEST_CODE
        )
    }

    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_MIC_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            pendingPermissionResult?.success(allGranted)
            pendingPermissionResult = null
        }
    }

    override fun onStop() {
        super.onStop()
        // If Activity is stopping before permission callback, notify the Flutter side
        if (pendingPermissionResult != null) {
            pendingPermissionResult?.success(false)
            pendingPermissionResult = null
        }
    }

    private fun isPictureInPictureSupported(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
    }

    private fun enterPictureInPicture(): Boolean {
        if (!isPictureInPictureSupported()) return false

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val builder = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                enterPictureInPictureMode(builder.build())
            } else {
                false
            }
        } catch (_: IllegalStateException) {
            false
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    /** Update PiP params (call when mic state changes for PiP actions). */
    private fun updatePipActions() {
        if (!isPictureInPictureSupported() || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        try {
            val builder = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                builder.setActions(buildPipActions())
            }
            setPictureInPictureParams(builder.build())
        } catch (_: Exception) {
            // ignore
        }
    }

    /** Build PiP remote action for mic toggle (Android 12+). */
    private fun buildPipActions(): List<RemoteAction> {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return emptyList()
        val micIconRes = if (currentMicEnabled)
            android.R.drawable.ic_btn_speak_now
        else
            android.R.drawable.ic_lock_lock
        val micAction = RemoteAction(
            Icon.createWithResource(this, micIconRes),
            if (currentMicEnabled) "Mute Mic" else "Unmute Mic",
            "Toggle microphone",
            android.app.PendingIntent.getBroadcast(
                this,
                0,
                android.content.Intent("com.yagyaashram.lms.PIP_TOGGLE_MIC"),
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )
        )
        return listOf(micAction)
    }

    // ── PiP lifecycle ─────────────────────────────────────────

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        // Notify Flutter about PiP mode change
        flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
            MethodChannel(messenger, pipChannel).invokeMethod(
                "onPipModeChanged",
                isInPictureInPictureMode
            )
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // User pressed Home/Recents — Flutter can auto-enter PiP via method channel
    }
}
