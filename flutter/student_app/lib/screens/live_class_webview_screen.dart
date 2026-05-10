import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
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

class _LiveClassWebViewScreenState extends State<LiveClassWebViewScreen>
    with WidgetsBindingObserver {
  late final WebViewController _controller;
  var _progress = 0;
  var _hasError = false;
  var _isPipSupported = false;
  var _isEnteringPip = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
    _prepareLiveClass();
  }

  Future<void> _prepareLiveClass() async {
    final pipSupported = await PictureInPictureService.isSupported();
    if (mounted) setState(() => _isPipSupported = pipSupported);
    await _loadLiveClass();
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

  Future<bool> _enterPictureInPicture({bool showMessage = false}) async {
    if (_isEnteringPip) return true;
    setState(() => _isEnteringPip = true);
    final didEnter = await PictureInPictureService.enter();
    if (mounted) setState(() => _isEnteringPip = false);

    if (!didEnter && showMessage && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Is device par Picture-in-Picture support nahi hai.'),
        ),
      );
    }
    return didEnter;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (!_isPipSupported) return;

    // When the student presses Home / switches apps during a live class,
    // move the activity into Android PiP so the WebView keeps the class visible
    // instead of making the user leave the class abruptly.
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _enterPictureInPicture();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<bool> _handleBackPressed() async {
    if (_isPipSupported) {
      final didEnter = await _enterPictureInPicture(showMessage: true);
      if (didEnter) return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _handleBackPressed,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: IconButton(
            tooltip: _isPipSupported ? 'Mini player' : 'Back',
            onPressed: () async {
              if (_isPipSupported) {
                await _enterPictureInPicture(showMessage: true);
              } else if (mounted) {
                Navigator.of(context).maybePop();
              }
            },
            icon: Icon(_isPipSupported ? Icons.picture_in_picture_alt : Icons.arrow_back),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(
                _isPipSupported
                    ? 'Home dabane par class mini player me chalegi'
                    : 'Secure website live classroom',
                style: const TextStyle(
                  color: AppTheme.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          actions: [
            if (_isPipSupported)
              IconButton(
                tooltip: 'Open mini player',
                onPressed: _isEnteringPip
                    ? null
                    : () => _enterPictureInPicture(showMessage: true),
                icon: _isEnteringPip
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.picture_in_picture_alt),
              ),
            IconButton(
              tooltip: 'Refresh',
              onPressed: () => _controller.reload(),
              icon: const Icon(Icons.refresh),
            ),
            IconButton(
              tooltip: 'Exit live class',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close),
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
            if (_isPipSupported)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: _PipHint(onTap: () => _enterPictureInPicture(showMessage: true)),
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
      ),
    );
  }
}

class _PipHint extends StatelessWidget {
  final VoidCallback onTap;

  const _PipHint({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xEE171717),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0x44EA580C)),
            boxShadow: const [
              BoxShadow(color: Color(0x66000000), blurRadius: 20, offset: Offset(0, 8)),
            ],
          ),
          child: const Row(
            children: [
              Icon(Icons.picture_in_picture_alt, color: AppTheme.primaryLight, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'App se bahar jayenge to live class chhote PiP window me chalti rahegi.',
                  style: TextStyle(color: Colors.white, fontSize: 12, height: 1.3),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
