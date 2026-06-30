import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CourseDetailScreen extends StatelessWidget {
  final Map<String, dynamic> course;
  final bool isEnrolled;

  const CourseDetailScreen({
    super.key,
    required this.course,
    this.isEnrolled = false,
  });

  @override
  Widget build(BuildContext context) {
    final title = (course['title'] ?? 'Course').toString();
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      backgroundColor: AppTheme.background,
      body: Center(
        child: Text(
          'Course detail for: $title',
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18),
        ),
      ),
    );
  }
}
