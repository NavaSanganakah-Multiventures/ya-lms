import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'admin_routes.dart';

class AdminRealTimeService {
  AdminRealTimeService._();
  static final AdminRealTimeService instance = AdminRealTimeService._();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  final Set<String> _subscribedChannels = {};
  bool _shouldReconnect = false;
  static const _storage = FlutterSecureStorage();

  final _dataController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get dataStream => _dataController.stream;
  Stream<bool> get connectionState => _connectionStateController.stream;

  bool get isConnected => _isConnected;

  String get _wsUrl {
    final httpBase = AdminRoutes.baseUrl.replaceFirst('https://', 'https://');
    return httpBase.replaceFirst('https://', 'wss://').replaceFirst('http://', 'ws://');
  }

  Future<String> _getSessionCookie() async {
    try {
      return await _storage.read(key: 'admin_session_cookie') ?? '';
    } catch (_) {
      return '';
    }
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
      final cookie = await _getSessionCookie();
      if (cookie.isEmpty) {
        debugPrint('[AdminRealTime] No session cookie — skipping WebSocket connect');
        return;
      }

      final uri = Uri.parse('$_wsUrl/api/ws');

      // web_socket_channel v3 does not support headers in connect() on web.
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;

      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(true);
      debugPrint('[AdminRealTime] WebSocket connected');

      // Cloudflare Edge WebSocket Hibernation handles 'ping' automatically
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
    _reconnectTimer?.cancel();
    final delay = Duration(
      milliseconds: (1000 * _reconnectAttempts.clamp(0, 30)).toInt(),
    );
    _reconnectAttempts++;
    _reconnectTimer = Timer(delay, _doConnect);
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
    disconnect();
    _dataController.close();
    _connectionStateController.close();
  }
}
