import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class LiveClassWebViewScreen extends StatefulWidget {
  final String courseId;
  final String title;

  const LiveClassWebViewScreen({
    super.key,
    required this.courseId,
    required this.title,
  });

  @override
  State<LiveClassWebViewScreen> createState() => _LiveClassWebViewScreenState();
}

class _LiveClassWebViewScreenState extends State<LiveClassWebViewScreen> {
  late final WebViewController _controller;
  var _progress = 0;
  var _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppTheme.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) => setState(() => _progress = progress),
          onPageStarted: (_) => setState(() => _hasError = false),
          onWebResourceError: (_) => setState(() => _hasError = true),
        ),
      );
    _loadLiveClass();
  }

  Future<void> _loadLiveClass() async {
    final sessionCookieValue = await ApiService.getSessionCookieValue();
    if (sessionCookieValue != null) {
      await WebViewCookieManager().setCookie(
        WebViewCookie(
          name: 'session',
          value: sessionCookieValue,
          domain: Uri.parse(ApiService.baseUrl).host,
          path: '/',
        ),
      );
    }
    await _controller.loadRequest(ApiService.liveClassWebUri(widget.courseId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            const Text(
              'Secure website live classroom',
              style: TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => _controller.reload(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_progress < 100)
            LinearProgressIndicator(
              value: _progress / 100,
              minHeight: 3,
              color: AppTheme.primary,
              backgroundColor: AppTheme.elevated,
            ),
          if (_hasError)
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.elevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Text(
                  'Live classroom load नहीं हो पाया। Internet/session check करके refresh करें।',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
