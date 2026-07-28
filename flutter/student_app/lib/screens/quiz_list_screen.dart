import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/app_shimmer.dart';
import 'quiz_active_screen.dart';

class QuizListScreen extends StatefulWidget {
 QuizListScreen({super.key});

 @override
 State<QuizListScreen> createState() => _QuizListScreenState();
}

class _QuizListScreenState extends State<QuizListScreen> {
 static String _cacheKey = 'quizzes_cache';
 static String _cacheTimeKey = 'quizzes_cache_time';
 static int _cacheTtlMs = 5 * 60 * 1000; // 5 minutes

 List<dynamic> _exams = [];
 bool _isLoading = true;
 String? _error;

 @override
 void initState() {
 super.initState();
 _fetchExams();
 }

 Future<void> _fetchExams({bool skipCache = false}) async {
 if (!mounted) return;
 setState(() {
 _isLoading = true;
 _error = null;
 });

 if (!skipCache) {
 final cached = await _loadCachedExams();
 if (cached != null && mounted) {
 setState(() {
 _exams = cached;
 _isLoading = false;
 });
 }
 }

 try {
 final response = await ApiService.getExams();
 if (!mounted) return;
 if (response.statusCode == 200) {
 final data = response.data;
 final exams = data['exams'] ?? [];
 await _cacheExams(exams);
 setState(() {
 _exams = exams;
 _isLoading = false;
 });
 } else {
 if (_exams.isEmpty) {
 setState(() {
 _error = 'Failed to load quizzes. Status: ${response.statusCode}';
 _isLoading = false;
 });
 } else {
 setState(() => _isLoading = false);
 }
 }
 } catch (e) {
 if (!mounted) return;
 if (_exams.isEmpty) {
 setState(() {
 _error = 'Error connecting to server: $e';
 _isLoading = false;
 });
 } else {
 setState(() => _isLoading = false);
 }
 }
 }

 Future<List<dynamic>?> _loadCachedExams() async {
 try {
 final prefs = await SharedPreferences.getInstance();
 final timestamp = prefs.getInt(_cacheTimeKey) ?? 0;
 final now = DateTime.now().millisecondsSinceEpoch;
 if (now - timestamp > _cacheTtlMs) return null;
 final json = prefs.getString(_cacheKey);
 if (json == null || json.isEmpty) return null;
 return jsonDecode(json) as List<dynamic>;
 } catch (e) {
 debugPrint('QuizList: cache load failed: $e');
 return null;
 }
 }

 Future<void> _cacheExams(List<dynamic> exams) async {
 try {
 final prefs = await SharedPreferences.getInstance();
 await prefs.setString(_cacheKey, jsonEncode(exams));
 await prefs.setInt(_cacheTimeKey, DateTime.now().millisecondsSinceEpoch);
 } catch (e) {
 debugPrint('QuizList: cache save failed: $e');
 }
 }

 void _openQuiz(Map<String, dynamic> quiz) {
 Navigator.push(
 context,
 MaterialPageRoute(
 builder: (context) => QuizActiveScreen(quiz: quiz),
 ),
 ).then((_) {
 if (mounted) _fetchExams(skipCache: true);
 });
 }

 @override
 Widget build(BuildContext context) {
 final quizzes = _exams.where((e) => e['type'] == 'quiz' || e['type'] == null).toList();

 return Scaffold(
 backgroundColor: AppTheme.backgroundOf(context),
 appBar: AppBar(
 title: Text('Quizzes'),
 backgroundColor: AppTheme.surfaceOf(context),
 elevation: 1,
 ),
 body: _isLoading && _exams.isEmpty
 ? Padding(
 padding: EdgeInsets.all(16),
 child: ListView.builder(
 itemCount: 6,
 itemBuilder: (_, __) => ShimmerCard(height: 84),
 ),
 )
 : _error != null && _exams.isEmpty
 ? Center(
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
 SizedBox(height: 16),
 Text(_error!, style: TextStyle(color: AppTheme.danger)),
 SizedBox(height: 16),
 ElevatedButton(
 onPressed: () => _fetchExams(skipCache: true),
 style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
 child: Text('Retry'),
 ),
 ],
 ),
 )
 : quizzes.isEmpty
 ? Center(
 child: Text('No quizzes available at the moment.', style: TextStyle(color: AppTheme.mutedOf(context))),
 )
 : RefreshIndicator(
 onRefresh: () => _fetchExams(skipCache: true),
 color: AppTheme.primary,
 backgroundColor: AppTheme.elevatedOf(context),
 child: ListView.builder(
 padding: EdgeInsets.all(16),
 itemCount: quizzes.length,
 itemBuilder: (context, index) {
 final quiz = quizzes[index];
 final title = quiz['title'] ?? 'Untitled Quiz';
 final duration = quiz['duration_minutes'] ?? 0;
 final marks = quiz['total_marks'] ?? 0;
 return Card(
 color: AppTheme.surfaceOf(context),
 margin: EdgeInsets.only(bottom: 12),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
 elevation: 0,
 child: ListTile(
 contentPadding: EdgeInsets.all(16),
 leading: Container(
 padding: EdgeInsets.all(12),
 decoration: BoxDecoration(
 color: AppTheme.primary.withAlphaOpacity(0.1),
 shape: BoxShape.circle,
 ),
 child: Icon(Icons.quiz_rounded, color: AppTheme.primary),
 ),
 title: Text(title, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
 subtitle: Padding(
 padding: EdgeInsets.only(top: 8.0),
 child: Text('Duration: $duration mins • Marks: $marks', style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 13)),
 ),
 trailing: Icon(Icons.chevron_right, color: AppTheme.mutedOf(context)),
 onTap: () => _openQuiz(quiz),
 ),
 );
 },
 ),
 ),
 );
 }
}