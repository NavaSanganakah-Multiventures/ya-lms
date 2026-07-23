import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class AdminWebViewScreen extends StatefulWidget {
  final Uri uri;
  final String title;

  const AdminWebViewScreen({super.key, required this.uri, required this.title});

  @override
  State<AdminWebViewScreen> createState() => _AdminWebViewScreenState();
}

class _AdminWebViewScreenState extends State<AdminWebViewScreen> {
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
    _injectSessionCookie().then((_) {
      _controller.loadRequest(widget.uri);
    });
  }

  Future<void> _injectSessionCookie() async {
    try {
      final parts = await AdminApiService.getSessionCookieParts();
      if (parts == null) return;
      final domain = widget.uri.host;
      if (domain.isEmpty) return;
      final cookie = WebViewCookie(
        name: parts['name']!,
        value: parts['value']!,
        domain: domain,
      );
      await WebViewCookieManager().setCookie(cookie);
    } catch (e) {
      debugPrint('[AdminWebView] cookie injection error: $e');
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          _controller.goBack();
        } else if (context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              const Text('Secure website admin', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Refresh',
              onPressed: () => _controller.reload(),
              icon: const Icon(Icons.refresh_rounded),
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
                    'Admin page load nahi ho paya. Internet/session check karke refresh karein.',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
