import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Internet connectivity monitor.
///
/// Har real change par listeners ko notify karta hai (2s debounce ke saath).
/// Pehli baar jab bhi koi [onChange] listener register karega tab
/// current status immediately callback kiya jayega.
class ConnectivityService {
  ConnectivityService._();

  static final ConnectivityService instance = ConnectivityService._();

  final Connectivity _connectivity = Connectivity();

  /// Kya abhi internet hai?
  bool _isConnected = true;
  bool get isConnected => _isConnected;

  final List<void Function(bool connected)> _listeners = [];

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Timer? _debounceTimer;

  /// Init — connectivity changes sunna shuru karo.
  void init() {
    _subscription?.cancel();
    _subscription = _connectivity.onConnectivityChanged.listen(_onChanged);

    // Pehli baar current status check karo
    _connectivity.checkConnectivity().then((results) {
      final connected = _evaluate(results);
      if (connected != _isConnected) {
        _isConnected = connected;
        _notifyListeners();
      }
    }).catchError((e) {
      debugPrint('[Connectivity] checkConnectivity error: $e');
    });
  }

  void _onChanged(List<ConnectivityResult> results) {
    // 2-second debounce: Android 12+ par connectivity_plus briefly
    // incorrect state report kar sakta hai (e.g., airplane mode ke baad
    // bhi connected dikhana). Debounce se ye false positives filter ho jayenge.
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(seconds: 2), () {
      _connectivity.checkConnectivity().then((latest) {
        final connected = _evaluate(latest);
        if (connected != _isConnected) {
          _isConnected = connected;
          _notifyListeners();
          debugPrint('[Connectivity] status changed: isConnected=$connected');
        }
      }).catchError((e) {
        debugPrint('[Connectivity] debounce re-check error: $e');
      });
    });
  }

  bool _evaluate(List<ConnectivityResult> results) {
    // Agar koi bhi result none nahi hai to internet hai
    // (wifi, mobile, ethernet, VPN, etc.)
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Internet status change par callback register karo.
  ///
  /// [immediate] = true (default) → register karte hi current status call karega.
  void onChange(void Function(bool connected) callback, {bool immediate = true}) {
    _listeners.add(callback);
    if (immediate) {
      callback(_isConnected);
    }
  }

  /// Callback remove karo.
  void removeListener(void Function(bool connected) callback) {
    _listeners.remove(callback);
  }

  void _notifyListeners() {
    for (final cb in _listeners) {
      try {
        cb(_isConnected);
      } catch (e) {
        debugPrint('[Connectivity] listener error: $e');
      }
    }
  }

  /// Cleanup — app dispose hote waqt call karein.
  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _listeners.clear();
  }
}
