import 'package:flutter/material.dart';
import 'package:flutter_cached_pdfview/flutter_cached_pdfview.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class PdfViewerScreen extends StatefulWidget {
 final String pdfUrl;
 final String title;

 const PdfViewerScreen({
 super.key,
 required this.pdfUrl,
 required this.title,
 });

 @override
 State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
 Map<String, String>? _headers;
 bool _loadingHeaders = true;

 @override
 void initState() {
 super.initState();
 _loadHeaders();
 }

 Future<void> _loadHeaders() async {
 try {
 final headers = await ApiService.getHeaders();
 // Remove Content-Type for PDF download — not needed and can confuse servers
 headers.remove('Content-Type');
 if (mounted) {
 setState(() {
 _headers = headers;
 _loadingHeaders = false;
 });
 }
 } catch (_) {
 if (mounted) {
 setState(() => _loadingHeaders = false);
 }
 }
 }

 @override
 Widget build(BuildContext context) {
 return Scaffold(
 backgroundColor: AppTheme.backgroundOf(context),
 appBar: AppBar(
 title: Text(widget.title, style: TextStyle(fontSize: 16)),
 backgroundColor: AppTheme.surfaceOf(context),
 elevation: 0,
 ),
 body: _loadingHeaders
 ? Center(child: CircularProgressIndicator(color: AppTheme.primary))
 : PDF(
 enableSwipe: true,
 swipeHorizontal: false,
 autoSpacing: false,
 pageFling: true,
 pageSnap: true,
 fitEachPage: true,
 ).cachedFromUrl(
 widget.pdfUrl,
 headers: _headers, // Pass auth cookies/JWT to backend
 placeholder: (progress) => Center(
 child: Column(
 mainAxisAlignment: MainAxisAlignment.center,
 children: [
 CircularProgressIndicator(color: AppTheme.primary),
 SizedBox(height: 16),
 Text('Loading PDF... ${progress.toInt()}%',
 style: TextStyle(color: AppTheme.textSecondaryOf(context))),
 ],
 ),
 ),
 errorWidget: (error) => Center(
 child: Padding(
 padding: EdgeInsets.all(16),
 child: Text(
 'PDF Load Error:\n$error',
 textAlign: TextAlign.center,
 style: TextStyle(color: AppTheme.danger),
 ),
 ),
 ),
 ),
 );
 }
}