import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import 'course_editor_screen.dart';
import 'manage_lessons_screen.dart';

class ManageCoursesScreen extends StatefulWidget {
  const ManageCoursesScreen({super.key});

  @override
  State<ManageCoursesScreen> createState() => _ManageCoursesScreenState();
}

class _ManageCoursesScreenState extends State<ManageCoursesScreen> {
  bool _isLoading = true;
  List<dynamic> _courses = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchCourses();
  }

  Future<void> _fetchCourses() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getCourses();
      if (response.statusCode == 200) {
        final decoded = response.data;
        setState(() {
          _courses = ApiUtils.extractList(decoded, 'courses');
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load courses';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Manage Courses'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CourseEditorScreen()),
              );
              if (result == true) {
                _fetchCourses();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchCourses,
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
                      ElevatedButton(onPressed: _fetchCourses, child: const Text('Retry')),
                    ],
                  ),
                )
              : _courses.isEmpty
                  ? const Center(
                      child: Text(
                        'No courses found.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _courses.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final course = _courses[index];
                        final title = course['title'] ?? course['name'] ?? 'Untitled Course';
                        final status = course['status'] ?? 'draft';
                        
                        return Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: const Color(0x22EA580C),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.library_books_rounded, color: AppTheme.primaryLight),
                            ),
                            title: Text(
                              title,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              maxLines: 2, overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: status == 'published' ? AppTheme.success.withAlpha(36) : AppTheme.info.withAlpha(36),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      status.toString().toUpperCase(),
                                      style: TextStyle(
                                        color: status == 'published' ? AppTheme.success : AppTheme.info,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.play_lesson, color: AppTheme.primaryLight),
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => ManageLessonsScreen(course: course)),
                                    );
                                  },
                                  tooltip: 'Manage Lessons',
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.muted, size: 16),
                              ],
                            ),
                            onTap: () async {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => CourseEditorScreen(course: course)),
                              );
                              if (result == true) {
                                _fetchCourses();
                              }
                            },
                          ),
                        );
                      },
                    ),
    );
  }
}
