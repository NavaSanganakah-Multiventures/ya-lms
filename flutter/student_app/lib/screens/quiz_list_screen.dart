import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'quiz_active_screen.dart';

class QuizListScreen extends StatefulWidget {
  const QuizListScreen({super.key});

  @override
  State<QuizListScreen> createState() => _QuizListScreenState();
}

class _QuizListScreenState extends State<QuizListScreen> {
  List<dynamic> _exams = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchExams();
  }

  Future<void> _fetchExams() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });
      final response = await ApiService.getExams();
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _exams = data['exams'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load quizzes. Status: ${response.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Error connecting to server: $e';
        _isLoading = false;
      });
    }
  }

  void _openQuiz(Map<String, dynamic> quiz) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QuizActiveScreen(quiz: quiz),
      ),
    ).then((_) {
      if (mounted) _fetchExams();
    });
  }

  @override
  Widget build(BuildContext context) {
    final quizzes = _exams.where((e) => e['type'] == 'quiz' || e['type'] == null).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Quizzes'),
        backgroundColor: AppTheme.surface,
        elevation: 1,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchExams,
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : quizzes.isEmpty
                  ? const Center(
                      child: Text('No quizzes available at the moment.', style: TextStyle(color: AppTheme.muted)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchExams,
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.elevated,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: quizzes.length,
                        itemBuilder: (context, index) {
                          final quiz = quizzes[index];
                          final title = quiz['title'] ?? 'Untitled Quiz';
                          final duration = quiz['duration_minutes'] ?? 0;
                          final marks = quiz['total_marks'] ?? 0;
                          return Card(
                            color: AppTheme.surface,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.quiz_rounded, color: AppTheme.primary),
                              ),
                              title: Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Text('Duration: $duration mins • Marks: $marks', style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                              ),
                              trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
                              onTap: () => _openQuiz(quiz),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
