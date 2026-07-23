import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class BatchEditorScreen extends StatefulWidget {
  final Map<String, dynamic>? batch;

  const BatchEditorScreen({super.key, this.batch});

  @override
  State<BatchEditorScreen> createState() => _BatchEditorScreenState();
}

class _BatchEditorScreenState extends State<BatchEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _nameHiController;
  late TextEditingController _descEnController;
  late TextEditingController _descHiController;
  late TextEditingController _costController;
  late TextEditingController _startDateController;
  late TextEditingController _endDateController;
  late TextEditingController _startTimeController;
  late TextEditingController _endTimeController;
  String _courseId = '';
  String _status = 'active';
  String _classDays = 'mon,wed,fri';
  bool _selfStudyGroup = false;
  bool _isSaving = false;
  late TextEditingController _courseIdController;
  late TextEditingController _classDaysController;

  bool get _isEditing => widget.batch != null;

  @override
  void initState() {
    super.initState();
    final b = widget.batch;
    _nameController = TextEditingController(text: b?['name'] ?? '');
    _nameHiController = TextEditingController(text: b?['name_hi'] ?? '');
    _descEnController = TextEditingController(text: b?['description_en'] ?? '');
    _descHiController = TextEditingController(text: b?['description_hi'] ?? '');
    _costController = TextEditingController(text: b?['cost_per_class_rupees']?.toString() ?? '');
    _startDateController = TextEditingController(text: _safeDateSubstring(b?['start_date']));
    _endDateController = TextEditingController(text: _safeDateSubstring(b?['end_date']));
    _startTimeController = TextEditingController(text: b?['class_start_time'] ?? '');
    _endTimeController = TextEditingController(text: b?['class_end_time'] ?? '');
    _courseId = b?['course_id']?.toString() ?? '';
    _status = b?['status'] ?? 'active';
    _classDays = b?['class_days'] ?? 'mon,wed,fri';
    _selfStudyGroup = b?['self_study_group_enabled'] == 1 || b?['self_study_group_enabled'] == true;
    _courseIdController = TextEditingController(text: _courseId);
    _classDaysController = TextEditingController(text: _classDays);
  }

  /// Safely extracts first 10 chars (YYYY-MM-DD) from a date value.
  String _safeDateSubstring(dynamic val) {
    if (val == null) return '';
    final s = val.toString();
    return s.length >= 10 ? s.substring(0, 10) : s;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nameHiController.dispose();
    _descEnController.dispose();
    _descHiController.dispose();
    _costController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    _startTimeController.dispose();
    _endTimeController.dispose();
    _courseIdController.dispose();
    _classDaysController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_courseId.isEmpty) {
      _showError('कृपया Course ID दर्ज करें');
      return;
    }

    setState(() => _isSaving = true);
    try {
      final data = {
        'course_id': _courseId,
        'name': _nameController.text.trim(),
        'name_hi': _nameHiController.text.trim(),
        'description_en': _descEnController.text.trim(),
        'description_hi': _descHiController.text.trim(),
        'start_date': _startDateController.text.trim(),
        'end_date': _endDateController.text.trim(),
        'status': _status,
        'class_days': _classDays,
        'class_start_time': _startTimeController.text.trim(),
        'class_end_time': _endTimeController.text.trim(),
        'self_study_group_enabled': _selfStudyGroup,
        if (_costController.text.trim().isNotEmpty)
          'cost_per_class_rupees': int.tryParse(_costController.text.trim()) ?? 0,
      };

      final Response response;
      if (_isEditing) {
        response = await AdminApiService.updateBatch(widget.batch!['id'], data);
      } else {
        response = await AdminApiService.createBatch(data);
      }

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEditing ? 'Batch अपडेट हो गया' : 'Batch बन गया')),
        );
        Navigator.pop(context, true);
      } else {
        final err = response.data;
        _showError(err['error'] ?? 'कुछ गलत हुआ');
      }
    } catch (e) {
      if (mounted) _showError('Error: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppTheme.danger));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Batch' : 'Create Batch'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(color: AppTheme.primaryLight)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _sectionHeader('Batch Info'),
            const SizedBox(height: 12),
            _buildField('Batch Name (English)', _nameController),
            const SizedBox(height: 12),
            _buildField('Batch Name (हिंदी)', _nameHiController),
            const SizedBox(height: 12),
            _buildField('Description (English)', _descEnController, maxLines: 3),
            const SizedBox(height: 12),
            _buildField('Description (हिंदी)', _descHiController, maxLines: 3),
            const SizedBox(height: 12),
            TextFormField(
              controller: _courseIdController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Course ID *',
                labelStyle: TextStyle(color: AppTheme.muted),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.border)),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primaryLight)),
              ),
              onChanged: (v) => _courseId = v.trim(),
            ),
            const SizedBox(height: 24),

            _sectionHeader('Schedule'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildField('Start Date (YYYY-MM-DD)', _startDateController)),
                const SizedBox(width: 12),
                Expanded(child: _buildField('End Date', _endDateController)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildField('Class Start Time (HH:MM)', _startTimeController)),
                const SizedBox(width: 12),
                Expanded(child: _buildField('Class End Time', _endTimeController)),
              ],
            ),
            const SizedBox(height: 12),
            _buildField('Class Days (mon,tue,wed,...)', _classDaysController,
                onChanged: (v) => _classDays = v),
            const SizedBox(height: 24),

            _sectionHeader('Settings'),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(
                labelText: 'Status',
                labelStyle: TextStyle(color: AppTheme.muted),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.border)),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primaryLight)),
              ),
              dropdownColor: AppTheme.elevated,
              style: const TextStyle(color: Colors.white),
              items: const [
                DropdownMenuItem(value: 'active', child: Text('Active')),
                DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                DropdownMenuItem(value: 'completed', child: Text('Completed')),
              ],
              onChanged: (v) => setState(() => _status = v ?? 'active'),
            ),
            const SizedBox(height: 12),
            _buildField('Cost per Class (₹)', _costController, keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            CheckboxListTile(
              value: _selfStudyGroup,
              onChanged: (v) => setState(() => _selfStudyGroup = v ?? false),
              title: const Text('Self-Study Group Enabled'),
              activeColor: AppTheme.primaryLight,
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 24),

            Center(
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _save,
                icon: _isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.save_rounded),
                label: Text(_isEditing ? 'Update Batch' : 'Create Batch'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryLight,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(title, style: const TextStyle(color: AppTheme.primaryLight, fontSize: 16, fontWeight: FontWeight.bold));
  }

  Widget _buildField(String label, TextEditingController controller, {int maxLines = 1, TextInputType? keyboardType, ValueChanged<String>? onChanged}) {
    return TextFormField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppTheme.muted),
        enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.border)),
        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primaryLight)),
      ),
      onChanged: onChanged,
    );
  }
}
