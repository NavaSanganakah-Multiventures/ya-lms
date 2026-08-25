import 'package:flutter/material.dart';
import 'web_view_native.dart'
    if (dart.library.html) 'web_view_web.dart';

/// Routes to the native WebView implementation on Android/iOS and to a
/// browser-link placeholder on web (webview_flutter does not support web).
class AdminWebViewScreen extends StatelessWidget {
  final Uri uri;
  final String title;

  const AdminWebViewScreen({
    super.key,
    required this.uri,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return AdminWebViewImpl(uri: uri, title: title);
  }
}
