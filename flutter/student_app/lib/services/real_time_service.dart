import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';

import 'api_service.dart';
import 'integrity_service.dart';

class RealTimeService with WidgetsBindingObserver {
  RealTimeService._() {
    WidgetsBinding.instance.addObserver(this);
  }
  static final RealTimeService instance = RealTimeService._();

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_shouldReconnect && !_isConnected) {
        debugPrint('[RealTime] App resumed, auto-reconnecting...');
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

  final _dataController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get dataStream => _dataController.stream;
  Stream<bool> get connectionState => _connectionStateController.stream;

  bool get isConnected => _isConnected;

  String get _wsUrl {
    return ApiService.baseUrl.replaceFirst('https://', 'wss://').replaceFirst('http://', 'ws://');
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
      final cookie = await ApiService.getSessionCookie();
      if (cookie.isEmpty) {
        debugPrint('[RealTime] No session cookie — skipping WebSocket connect');
        return;
      }

      final sessionToken = await ApiService.getSessionCookieValue();
      final uri = Uri.parse('$_wsUrl/api/ws${sessionToken != null ? "?token=$sessionToken" : ""}');
      final headers = <String, String>{
        'Cookie': cookie,
        'User-Agent': 'AdityanveshanApp/1.0',
      };

      final appJwt = await ApiService.getSessionCookieValue();
      if (appJwt != null) {
        final storedJwt = await IntegrityService.getAppJwt();
        if (storedJwt != null && storedJwt.isNotEmpty) {
          headers['X-App-JWT'] = storedJwt;
        }
      }

      _channel = IOWebSocketChannel.connect(uri, headers: headers);

      await _channel!.ready;
      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(true);
      debugPrint('[RealTime] WebSocket connected');

      // Cloudflare Edge WebSocket Hibernation handles 'ping' automatically!
      // But keeping a lightweight ping from client helps keep the connection alive through NATs/Firewalls.
      // Changing ping interval to 45 seconds to reduce unnecessary wakeups if Hibernation isn't fully active.
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
          debugPrint('[RealTime] WebSocket error: $error');
          _isConnected = false;
          _connectionStateController.add(false);
          _pingTimer?.cancel();
          if (_shouldReconnect) _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('[RealTime] Connection failed: $e');
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
    debugPrint('[RealTime] Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');
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
