import 'package:flutter/material.dart';
import 'package:flutter_cached_pdfview/flutter_cached_pdfview.dart';
import '../theme/app_theme.dart';

class PdfViewerScreen extends StatelessWidget {
  final String pdfUrl;
  final String title;

  const PdfViewerScreen({
    super.key,
    required this.pdfUrl,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontSize: 16)),
        backgroundColor: AppTheme.surface,
        elevation: 0,
      ),
      body: const PDF(
        enableSwipe: true,
        swipeHorizontal: false,
        autoSpacing: false,
        pageFling: true,
        pageSnap: true,
        fitEachPage: true,
      ).cachedFromUrl(
        pdfUrl,
        placeholder: (progress) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: AppTheme.primary),
              const SizedBox(height: 16),
              Text('Loading PDF... ${progress.toInt()}%', style: const TextStyle(color: Colors.white)),
            ],
          ),
        ),
        errorWidget: (error) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'PDF Load Error:\n$error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.danger),
            ),
          ),
        ),
      ),
    );
  }
}
