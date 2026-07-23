import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import 'lesson_editor_screen.dart';
import 'course_books_screen.dart';

class ManageLessonsScreen extends StatefulWidget {
  final Map<String, dynamic> course;

  const ManageLessonsScreen({super.key, required this.course});

  @override
  State<ManageLessonsScreen> createState() => _ManageLessonsScreenState();
}

class _ManageLessonsScreenState extends State<ManageLessonsScreen> {
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
      final response = await AdminApiService.getCourseLessons(widget.course['id']?.toString() ?? '');
      if (response.statusCode == 200) {
        final decoded = response.data;
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
        title: const Text('Delete Lesson'),
        content: const Text('Are you sure you want to delete this lesson?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final response = await AdminApiService.deleteCourseLesson(widget.course['id']?.toString() ?? '', lessonId);
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
        title: Text('Lessons: ${widget.course['title']}'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.book_rounded),
            tooltip: 'Course Books',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CourseBooksScreen(
                  courseId: widget.course['id']?.toString() ?? '',
                  courseTitle: widget.course['title'] ?? '',
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => LessonEditorScreen(course: widget.course)),
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
                      ElevatedButton(onPressed: _fetchLessons, child: const Text('Retry')),
                    ],
                  ),
                )
              : _lessons.isEmpty
                  ? const Center(
                      child: Text(
                        'No lessons found.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
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
                              'Type: ${lesson['type'] ?? 'Video'}',
                              style: const TextStyle(color: AppTheme.muted),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit, color: AppTheme.info),
                                  onPressed: () async {
                                    final result = await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => LessonEditorScreen(course: widget.course, lesson: lesson)),
                                    );
                                    if (result == true) {
                                      _fetchLessons();
                                    }
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: AppTheme.danger),
                                  onPressed: () => _deleteLesson(lesson['id']?.toString() ?? ''),
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
