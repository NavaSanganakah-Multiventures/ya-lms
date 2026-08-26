import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'admin_routes.dart';
import 'session_storage_service.dart';
import 'real_time_channel_stub.dart'
    if (dart.library.html) 'real_time_channel_html.dart'
    if (dart.library.io) 'real_time_channel_io.dart' as channel_factory;

class AdminRealTimeService with WidgetsBindingObserver {
  AdminRealTimeService._() {
    WidgetsBinding.instance.addObserver(this);
  }
  static final AdminRealTimeService instance = AdminRealTimeService._();

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_shouldReconnect && !_isConnected) {
        debugPrint('[AdminRealTime] App resumed, auto-reconnecting...');
        connect();
      }
    }
  }

  void disposeObserver() {
    WidgetsBinding.instance.removeObserver(this);
  }

  WebSocketChannel? _channel;
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  final Set<String> _subscribedChannels = {};
  bool _shouldReconnect = false;
  static const int _maxReconnectAttempts = 20;

  final _dataController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get dataStream => _dataController.stream;
  Stream<bool> get connectionState => _connectionStateController.stream;

  bool get isConnected => _isConnected;

  String get _wsUrl {
    return AdminRoutes.baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://');
  }

  Future<Map<String, String>> _getConnectionHeaders() async {
    // The web browser sends cookies automatically for same-origin requests.
    // For cross-origin WebSockets the cookie is only sent when configured
    // correctly on the backend; we avoid custom headers on web because the
    // browser WebSocket API does not support them.
    if (kIsWeb) return {};
    final cookie = await AdminSessionStorage.getSessionCookie();
    if (cookie.isEmpty) return {};
    return {'Cookie': cookie};
  }

  Future<void> connect() async {
    if (_isConnected) return;
    _shouldReconnect = true;
    _reconnectAttempts = 0;
    await _doConnect();
  }

  Future<void> disconnect() async {
    _shouldReconnect = false;
    _reconnectAttempts = 0;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _pingTimer?.cancel();
    _pingTimer = null;
    await _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _connectionStateController.add(false);
  }

  Future<void> _doConnect() async {
    try {
      final headers = await _getConnectionHeaders();

      // On mobile we still require a stored session cookie.
      if (!kIsWeb && headers.isEmpty) {
        debugPrint('[AdminRealTime] No session cookie — skipping WebSocket connect');
        return;
      }

      final uri = Uri.parse('$_wsUrl/api/data');

      _channel = channel_factory.connect(uri, headers: headers);
      await _channel!.ready;

      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(true);
      debugPrint('[AdminRealTime] WebSocket connected');

      _pingTimer = Timer.periodic(const Duration(seconds: 45), (_) {
        try {
          _channel?.sink.add(jsonEncode({'type': 'ping'}));
        } catch (_) {}
      });

      for (final ch in _subscribedChannels) {
        _channel!.sink.add(jsonEncode({'type': 'subscribe', 'channel': ch}));
      }

      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message as String) as Map<String, dynamic>;
            if (data['type'] == 'pong') return;
            _dataController.add(data);
          } catch (_) {}
        },
        onDone: () {
          _isConnected = false;
          _connectionStateController.add(false);
          _pingTimer?.cancel();
          if (_shouldReconnect) _scheduleReconnect();
        },
        onError: (error) {
          debugPrint('[AdminRealTime] WebSocket error: $error');
          _isConnected = false;
          _connectionStateController.add(false);
          _pingTimer?.cancel();
          if (_shouldReconnect) _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('[AdminRealTime] Connection failed: $e');
      _isConnected = false;
      _connectionStateController.add(false);
      if (_shouldReconnect) _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (!_shouldReconnect) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[AdminRealTime] Max reconnect attempts reached — giving up');
      return;
    }
    _reconnectTimer?.cancel();
    final delay = Duration(
      milliseconds: (1000 * _reconnectAttempts.clamp(0, 30)).toInt(),
    );
    _reconnectAttempts++;
    _reconnectTimer = Timer(delay, () {
      if (_shouldReconnect) _doConnect();
    });
    debugPrint('[AdminRealTime] Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');
  }

  void subscribe(String channel) {
    _subscribedChannels.add(channel);
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode({'type': 'subscribe', 'channel': channel}));
    }
  }

  void unsubscribe(String channel) {
    _subscribedChannels.remove(channel);
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode({'type': 'unsubscribe', 'channel': channel}));
    }
  }

  void dispose() {
    disposeObserver();
    disconnect();
    _dataController.close();
    _connectionStateController.close();
  }
}
