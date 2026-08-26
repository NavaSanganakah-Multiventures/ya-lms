import 'dart:html' as html;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AdminWebViewImpl extends StatelessWidget {
  final Uri uri;
  final String title;

  const AdminWebViewImpl({
    super.key,
    required this.uri,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.open_in_browser_rounded, size: 64, color: AppTheme.primary),
              const SizedBox(height: 16),
              Text(
                'This page opens outside the app',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Because this is the web version of the admin console, the link will open in a new browser tab.',
                style: TextStyle(color: AppTheme.muted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => html.window.open(uri.toString(), '_blank'),
                icon: const Icon(Icons.launch),
                label: const Text('Open in new tab'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
