import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/yuva/index.dart';
import 'quiz_active_screen.dart';

class QuizListScreen extends StatefulWidget {
  QuizListScreen({super.key});

  @override
  State<QuizListScreen> createState() => _QuizListScreenState();
}

class _QuizListScreenState extends State<QuizListScreen> {
  static String _cacheKey = 'quizzes_cache';
  static String _cacheTimeKey = 'quizzes_cache_time';
  static int _cacheTtlMs = 5 * 60 * 1000;

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
      MaterialPageRoute(builder: (context) => QuizActiveScreen(quiz: quiz)),
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
        title: Text(
          'Quizzes',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimaryOf(context)),
        ),
        backgroundColor: AppTheme.backgroundOf(context),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _isLoading && _exams.isEmpty
          ? _QuizListLoading()
          : _error != null && _exams.isEmpty
              ? _QuizListError(message: _error!, onRetry: () => _fetchExams(skipCache: true))
              : quizzes.isEmpty
                  ? _QuizListEmpty()
                  : RefreshIndicator(
                      onRefresh: () => _fetchExams(skipCache: true),
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.surfaceOf(context),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(AppTheme.space4),
                        itemCount: quizzes.length,
                        itemBuilder: (context, index) {
                          final quiz = quizzes[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppTheme.space3),
                            child: QuizCard(
                              quiz: quiz is Map<String, dynamic> ? quiz : <String, dynamic>{},
                              index: index,
                              onTap: () => _openQuiz(quiz is Map<String, dynamic> ? quiz : <String, dynamic>{}),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _QuizListLoading extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTheme.space4),
      child: ListView.builder(
        itemCount: 6,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.only(bottom: AppTheme.space3),
          child: const YuvaShimmerCard(height: 90),
        ),
      ),
    );
  }
}

class _QuizListError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _QuizListError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space6),
        child: YuvaEmptyState.error(
          title: message,
          actionLabel: 'Try Again',
          onAction: onRetry,
        ),
      ),
    );
  }
}

class _QuizListEmpty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: YuvaEmptyState.noData(
        title: 'No quizzes available',
        subtitle: 'Check back later for new quizzes and exams.',
      ),
    );
  }
}