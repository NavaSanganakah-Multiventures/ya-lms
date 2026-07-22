import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import 'book_lesson_editor_screen.dart';

class ManageBookLessonsScreen extends StatefulWidget {
  final Map<String, dynamic> book;

  const ManageBookLessonsScreen({super.key, required this.book});

  @override
  State<ManageBookLessonsScreen> createState() => _ManageBookLessonsScreenState();
}

class _ManageBookLessonsScreenState extends State<ManageBookLessonsScreen> {
  bool _isLoading = true;
  List<dynamic> _lessons = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLessons();
  }

  Future<void> _fetchLessons() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getBookLessons(widget.book['id']);
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _lessons = ApiUtils.extractList(decoded, 'lessons');
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load lessons';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteLesson(String lessonId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('पाठ हटाएँ (Delete Lesson)'),
        content: const Text('क्या आप इस पाठ को हटाना चाहते हैं?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('रद्द करें (Cancel)')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('हटाएँ (Delete)', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final response = await AdminApiService.deleteBookLesson(widget.book['id'], lessonId);
      if (response.statusCode == 200) {
        _fetchLessons();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lesson deleted'), backgroundColor: AppTheme.success));
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete lesson'), backgroundColor: AppTheme.danger));
        }
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('पाठ: ${widget.book['title']}'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => BookLessonEditorScreen(book: widget.book)),
              );
              if (result == true) {
                _fetchLessons();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchLessons,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryLight))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _fetchLessons, child: const Text('पुनः प्रयास (Retry)')),
                    ],
                  ),
                )
              : _lessons.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.menu_book_rounded, size: 64, color: AppTheme.muted),
                          SizedBox(height: 16),
                          Text(
                            'कोई पाठ नहीं (No lessons)',
                            style: TextStyle(color: AppTheme.muted, fontSize: 16),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'ऊपर + बटन से नया पाठ जोड़ें',
                            style: TextStyle(color: AppTheme.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _lessons.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final lesson = _lessons[index];
                        return Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: ListTile(
                            leading: const Icon(Icons.play_circle_fill_rounded, color: AppTheme.primaryLight, size: 40),
                            title: Text(
                              lesson['title'] ?? 'Untitled Lesson',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              maxLines: 2, overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${lesson['chapter_title'] ?? 'General'} · ${lesson['type'] ?? 'Video'}',
                              style: const TextStyle(color: AppTheme.muted),
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit, color: AppTheme.info),
                                  onPressed: () async {
                                    final result = await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => BookLessonEditorScreen(book: widget.book, lesson: lesson)),
                                    );
                                    if (result == true) {
                                      _fetchLessons();
                                    }
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: AppTheme.danger),
                                  onPressed: () => _deleteLesson(lesson['id']),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
