import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class LessonEditorScreen extends StatefulWidget {
  final Map<String, dynamic> course;
  final Map<String, dynamic>? lesson; // null if creating new

  const LessonEditorScreen({super.key, required this.course, this.lesson});

  @override
  State<LessonEditorScreen> createState() => _LessonEditorScreenState();
}

class _LessonEditorScreenState extends State<LessonEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  late TextEditingController _titleController;
  late TextEditingController _chapterController;
  String _type = 'video';

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.lesson?['title'] ?? '');
    _chapterController = TextEditingController(text: widget.lesson?['chapter_title'] ?? '');
    _type = widget.lesson?['type'] ?? 'video';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _chapterController.dispose();
    super.dispose();
  }

  Future<void> _saveLesson() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final payload = {
      'title': _titleController.text.trim(),
      'chapter_title': _chapterController.text.trim(),
      'type': _type,
    };

    try {
      final response = widget.lesson == null
          ? await AdminApiService.createCourseLesson(widget.course['id'], payload)
          : await AdminApiService.updateCourseLesson(widget.course['id'], widget.lesson!['id'], payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lesson saved successfully'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to save lesson'), backgroundColor: AppTheme.danger)
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: AppTheme.danger)
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(widget.lesson == null ? 'Add Lesson' : 'Edit Lesson'),
        backgroundColor: AppTheme.surface,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryLight))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Lesson Title'),
                      validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _chapterController,
                      decoration: const InputDecoration(labelText: 'Chapter Name'),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _type,
                      decoration: const InputDecoration(labelText: 'Media Type'),
                      dropdownColor: AppTheme.elevated,
                      items: const [
                        DropdownMenuItem(value: 'video', child: Text('Video')),
                        DropdownMenuItem(value: 'audio', child: Text('Audio')),
                        DropdownMenuItem(value: 'pdf', child: Text('PDF Document')),
                        DropdownMenuItem(value: 'recording', child: Text('Live Recording')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _type = v);
                      },
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: _saveLesson,
                      child: Text(widget.lesson == null ? 'ADD LESSON' : 'UPDATE LESSON'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
