import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class LiveClassEditorScreen extends StatefulWidget {
  final Map<String, dynamic>? session; // null if creating
  final String? preselectedCourseId;

  const LiveClassEditorScreen({super.key, this.session, this.preselectedCourseId});

  @override
  State<LiveClassEditorScreen> createState() => _LiveClassEditorScreenState();
}

class _LiveClassEditorScreenState extends State<LiveClassEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  List<dynamic> _courses = [];

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  String? _selectedCourseId;
  DateTime? _scheduledAt;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.session?['title'] ?? '');
    _descriptionController = TextEditingController(text: widget.session?['description'] ?? '');
    _selectedCourseId = widget.session?['course_id'] ?? widget.preselectedCourseId;

    if (widget.session?['scheduled_at'] != null) {
      _scheduledAt = DateTime.tryParse(widget.session!['scheduled_at']);
    }

    _fetchCourses();
  }

  Future<void> _fetchCourses() async {
    try {
      final response = await AdminApiService.getCourses();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (!mounted) return;
        setState(() {
          _courses = List<dynamic>.from(data['courses'] ?? data ?? []);
          // Validate selected course id exists in the list
          if (_selectedCourseId != null && !_courses.any((c) => c['id'].toString() == _selectedCourseId.toString())) {
            _selectedCourseId = null;
          }
        });
      }
    } catch (e) {
      debugPrint('Failed to fetch courses: $e');
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime() async {
    final now = DateTime.now();
    DateTime initial = _scheduledAt ?? now;
    if (initial.isBefore(now)) {
      initial = now;
    }

    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.danger,
              onPrimary: Colors.white,
              surface: AppTheme.surface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (date != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_scheduledAt ?? DateTime.now()),
        builder: (context, child) {
          return Theme(
            data: ThemeData.dark().copyWith(
              colorScheme: const ColorScheme.dark(
                primary: AppTheme.danger,
                onPrimary: Colors.white,
                surface: AppTheme.surface,
                onSurface: Colors.white,
              ),
            ),
            child: child!,
          );
        },
      );

      if (time != null) {
        setState(() {
          _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        });
      }
    }
  }

  Future<void> _saveSession() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a course'), backgroundColor: AppTheme.danger));
      return;
    }
    if (_scheduledAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please schedule a time'), backgroundColor: AppTheme.danger));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'scheduled_at': _scheduledAt!.toIso8601String(),
    };

    try {
      final response = widget.session == null
          ? await AdminApiService.createLiveSession(_selectedCourseId!, payload)
          : await AdminApiService.updateLiveSession(widget.session!['id'].toString(), payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          final messenger = ScaffoldMessenger.of(context);
          Navigator.pop(context, true);
          messenger.showSnackBar(
            SnackBar(content: Text(widget.session == null ? 'Live Class Scheduled' : 'Live Class Updated'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to save live session'), backgroundColor: AppTheme.danger)
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger));
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
        title: Text(widget.session == null ? 'Schedule Live Class' : 'Edit Live Class'),
        backgroundColor: AppTheme.surface,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.danger))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      value: _selectedCourseId,
                      decoration: const InputDecoration(labelText: 'Select Course'),
                      dropdownColor: AppTheme.elevated,
                      items: _courses.map((c) => DropdownMenuItem<String>(
                        value: c['id'].toString(),
                        child: Text(c['title'] ?? 'Untitled', maxLines: 1, overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: widget.session == null ? (v) {
                        if (v != null) setState(() => _selectedCourseId = v);
                      } : null, // Cannot change course once created
                      validator: (v) => v == null ? 'Course is required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Topic / Title'),
                      validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Description (Optional)'),
                    ),
                    const SizedBox(height: 24),
                    ListTile(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: AppTheme.border),
                      ),
                      tileColor: AppTheme.elevated,
                      leading: const Icon(Icons.calendar_month, color: AppTheme.danger),
                      title: Text(_scheduledAt == null ? 'Select Date & Time' : _scheduledAt.toString().substring(0, 16)),
                      trailing: const Icon(Icons.edit, size: 20),
                      onTap: _selectDateTime,
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
                      onPressed: _saveSession,
                      child: Text(widget.session == null ? 'SCHEDULE LIVE CLASS' : 'UPDATE LIVE CLASS'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
