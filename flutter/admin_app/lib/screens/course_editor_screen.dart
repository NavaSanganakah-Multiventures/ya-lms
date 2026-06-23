import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class CourseEditorScreen extends StatefulWidget {
  final Map<String, dynamic>? course; // null if creating new

  const CourseEditorScreen({super.key, this.course});

  @override
  State<CourseEditorScreen> createState() => _CourseEditorScreenState();
}

class _CourseEditorScreenState extends State<CourseEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _priceController;
  late TextEditingController _teacherController;
  String _status = 'draft';

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.course?['title'] ?? '');
    _descriptionController = TextEditingController(text: widget.course?['description'] ?? '');
    _priceController = TextEditingController(text: widget.course?['price_inr']?.toString() ?? '0');
    _teacherController = TextEditingController(text: widget.course?['teacher_name'] ?? '');

    final statusVal = widget.course?['status'];
    if (statusVal == 'draft' || statusVal == 'published') {
      _status = statusVal;
    } else {
      _status = 'draft';
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _teacherController.dispose();
    super.dispose();
  }

  Future<void> _saveCourse() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final payload = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'price_inr': int.tryParse(_priceController.text) ?? 0,
      'teacher_name': _teacherController.text.trim(),
      'status': _status,
    };

    try {
      final response = widget.course == null
          ? await AdminApiService.createCourse(payload)
          : await AdminApiService.updateCourse(widget.course!['id'], payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          final messenger = ScaffoldMessenger.of(context);
          Navigator.pop(context, true); // true indicates success
          messenger.showSnackBar(
            SnackBar(content: Text(widget.course == null ? 'Course created successfully' : 'Course updated successfully'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to save course'), backgroundColor: AppTheme.danger)
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
        title: Text(widget.course == null ? 'Create Course' : 'Edit Course'),
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
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Description'),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Price (INR)', prefixText: '₹ '),
                      validator: (v) {
                        if (v == null || v.isEmpty) return null;
                        final price = int.tryParse(v);
                        if (price == null || price < 0) return 'Please enter a valid non-negative integer';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _teacherController,
                      decoration: const InputDecoration(labelText: 'Teacher Name'),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      dropdownColor: AppTheme.elevated,
                      items: const [
                        DropdownMenuItem(value: 'draft', child: Text('Draft')),
                        DropdownMenuItem(value: 'published', child: Text('Published')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _status = v);
                      },
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: _saveCourse,
                      child: Text(widget.course == null ? 'CREATE COURSE' : 'UPDATE COURSE'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
