import 'package:flutter/material.dart';

/// Manages the live class Picture-in-Picture mode globally.
///
/// When a student joins a live class, the RealtimeKit meeting widget is
/// stored here so it can be shown in:
///   - Full-screen mode (LiveClassRealtimeKitScreen)
///   - Mini-player overlay (floats above all screens)
///   - OS-level Android PiP (when app is backgrounded)
///
/// ## State flow
///
///   idle ──[join]──▶ fullScreen ──[back]──▶ miniPlayer ──[tap]──▶ fullScreen
///     │                                     │
///     └────[leave]──────────── \─────────────┘
///
class LiveClassPipManager extends ChangeNotifier {
  // ── Singleton ──────────────────────────────────────────────
  LiveClassPipManager._();
  static final LiveClassPipManager instance = LiveClassPipManager._();

  // ── Meeting metadata ───────────────────────────────────────
  String? meetingId;
  String? sessionId;
  String title = '';
  int maxMinutes = -1;

  // ── Core state ─────────────────────────────────────────────
  Widget? _meetingWidget;
  bool _micEnabled = true;
  bool _isActive = false;
  PipDisplayMode _mode = PipDisplayMode.idle;

  // Optional callback for toggling mic on the actual RealtimeKit meeting.
  // Registered by LiveClassRealtimeKitScreen when it creates the meeting.
  VoidCallback? onToggleMic;

  // ── Getters ────────────────────────────────────────────────
  bool get isActive => _isActive;
  bool get micEnabled => _micEnabled;
  PipDisplayMode get mode => _mode;
  Widget? get meetingWidget => _meetingWidget;
  bool get isMiniPlayerVisible =>
      _isActive && _mode == PipDisplayMode.miniPlayer;

  // ── Actions ────────────────────────────────────────────────

  /// Call when the live class meeting has been created.
  void startLiveClass({
    required Widget meetingWidget,
    required String title,
    String? meetingId,
    String? sessionId,
    int maxMinutes = -1,
  }) {
    _meetingWidget = meetingWidget;
    this.title = title;
    this.meetingId = meetingId;
    this.sessionId = sessionId;
    this.maxMinutes = maxMinutes;
    _micEnabled = true;
    _isActive = true;
    _mode = PipDisplayMode.fullScreen;
    notifyListeners();
  }

  /// Minimise the live class to the in-app mini player overlay.
  void enterMiniPlayer() {
    if (!_isActive) return;
    _mode = PipDisplayMode.miniPlayer;
    notifyListeners();
  }

  /// Return to the full-screen live class view.
  void enterFullScreen() {
    if (!_isActive) return;
    _mode = PipDisplayMode.fullScreen;
    notifyListeners();
  }

  /// Toggle the microphone on/off.
  void toggleMic() {
    _micEnabled = !_micEnabled;
    // Call the actual RealtimeKit mic toggle if registered
    onToggleMic?.call();
    notifyListeners();
  }

  /// Fully stop the live class and release resources.
  void stopLiveClass() {
    // Only dispose if we're still holding the widget
    // (the screen might have already disposed it)
    _meetingWidget = null;
    _isActive = false;
    _mode = PipDisplayMode.idle;
    meetingId = null;
    sessionId = null;
    notifyListeners();
  }

  /// Notify that the OS-level PiP mode has changed (Android).
  void onOsPipModeChanged(bool isInPip) {
    if (isInPip) {
      _mode = PipDisplayMode.osPip;
    } else if (_isActive && _mode == PipDisplayMode.osPip) {
      // Came back from OS PiP — restore mini player
      _mode = PipDisplayMode.miniPlayer;
    }
    notifyListeners();
  }
}

enum PipDisplayMode { idle, fullScreen, miniPlayer, osPip }
