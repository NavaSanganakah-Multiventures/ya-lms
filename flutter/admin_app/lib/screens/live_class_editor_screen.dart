import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';

class LiveClassEditorScreen extends StatefulWidget {
  final Map<String, dynamic>? session;
  final String? preselectedCourseId;

  const LiveClassEditorScreen({super.key, this.session, this.preselectedCourseId});

  @override
  State<LiveClassEditorScreen> createState() => _LiveClassEditorScreenState();
}

class _LiveClassEditorScreenState extends State<LiveClassEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  List<dynamic> _courses = [];
  List<dynamic> _batches = [];
  String? _coursesError;
  String? _batchesError;

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  String? _selectedCourseId;
  String? _selectedBatchId;
  Map<String, dynamic>? _selectedBatch;
  DateTime? _scheduledAt;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.session?['title'] ?? '');
    _descriptionController = TextEditingController(text: widget.session?['description'] ?? '');
    _selectedCourseId = widget.session?['course_id'] ?? widget.preselectedCourseId;
    _selectedBatchId = widget.session?['batch_id'];

    if (widget.session?['start_time'] != null) {
      _scheduledAt = DateTime.tryParse(widget.session!['start_time']);
    }

    _fetchCourses();
  }

  Future<void> _fetchCourses() async {
    setState(() => _coursesError = null);
    try {
      final response = await AdminApiService.getCourses();
      if (response.statusCode == 200) {
        final decoded = response.data;
        setState(() {
          _courses = ApiUtils.extractList(decoded, 'courses');
          if (_selectedCourseId != null && !_courses.any((c) => c['id'] == _selectedCourseId)) {
            _selectedCourseId = null;
          }
        });
        if (_selectedCourseId != null) {
          _fetchBatches(_selectedCourseId!);
        }
      } else {
        setState(() => _coursesError = 'Failed to load courses');
      }
    } catch (e) {
      setState(() => _coursesError = 'Network error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Courses load nahi ho sake: $e'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  Future<void> _fetchBatches(String courseId) async {
    setState(() => _batchesError = null);
    try {
      final response = await AdminApiService.getBatches(courseId: courseId);
      if (response.statusCode == 200) {
        final decoded = response.data;
        setState(() {
          _batches = ApiUtils.extractList(decoded, 'batches');
          if (_selectedBatchId != null) {
            final match = _batches.where((b) => b['id'] == _selectedBatchId).toList();
            if (match.isNotEmpty) {
              _selectedBatch = match.first;
            } else {
              _selectedBatchId = null;
              _selectedBatch = null;
            }
          }
        });
      } else {
        setState(() => _batchesError = 'Failed to load batches');
      }
    } catch (e) {
      setState(() => _batchesError = 'Network error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Batches load nahi ho sake: $e'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  DateTime _getNextClassDay(String classDays, DateTime fromDate) {
    final dayMap = {
      'mon': DateTime.monday, 'tue': DateTime.tuesday, 'wed': DateTime.wednesday,
      'thu': DateTime.thursday, 'fri': DateTime.friday, 'sat': DateTime.saturday, 'sun': DateTime.sunday,
      'monday': DateTime.monday, 'tuesday': DateTime.tuesday, 'wednesday': DateTime.wednesday,
      'thursday': DateTime.thursday, 'friday': DateTime.friday, 'saturday': DateTime.saturday, 'sunday': DateTime.sunday,
    };

    final requestedDays = classDays
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .where((d) => dayMap.containsKey(d))
        .map((d) => dayMap[d]!)
        .toList();

    if (requestedDays.isEmpty) return fromDate;

    DateTime candidate = fromDate;
    for (int i = 0; i < 8; i++) {
      if (requestedDays.contains(candidate.weekday)) {
        return candidate;
      }
      candidate = candidate.add(const Duration(days: 1));
    }
    return fromDate;
  }

  void _applyBatchTiming(Map<String, dynamic> batch) {
    final classStartTime = batch['class_start_time'] as String?;
    final classDays = batch['class_days'] as String?;

    if (classStartTime == null) return;

    final timeParts = classStartTime.split(':');
    final hour = int.tryParse(timeParts[0]) ?? 0;
    final minute = timeParts.length > 1 ? (int.tryParse(timeParts[1]) ?? 0) : 0;

    final now = DateTime.now();
    DateTime nextDate = now;
    if (classDays != null && classDays.isNotEmpty) {
      nextDate = _getNextClassDay(classDays, now);
    }

    setState(() {
      _scheduledAt = DateTime(nextDate.year, nextDate.month, nextDate.day, hour, minute);
    });
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
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
      final hour = _scheduledAt?.hour ?? _batchStartHour;
      final minute = _scheduledAt?.minute ?? _batchStartMinute;
      setState(() {
        _scheduledAt = DateTime(date.year, date.month, date.day, hour, minute);
      });
    }
  }

  int get _batchStartHour {
    final time = _selectedBatch?['class_start_time'];
    if (time == null) return DateTime.now().hour;
    return int.tryParse(time.toString().split(':')[0]) ?? DateTime.now().hour;
  }

  int get _batchStartMinute {
    final time = _selectedBatch?['class_start_time'];
    if (time == null) return DateTime.now().minute;
    final parts = time.toString().split(':');
    return parts.length > 1 ? (int.tryParse(parts[1]) ?? DateTime.now().minute) : DateTime.now().minute;
  }

  Future<void> _selectTime() async {
    final initial = _scheduledAt ?? DateTime.now();
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial.hour, minute: initial.minute),
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

    if (time != null && mounted && _scheduledAt != null) {
      setState(() {
        _scheduledAt = DateTime(
          _scheduledAt!.year,
          _scheduledAt!.month,
          _scheduledAt!.day,
          time.hour,
          time.minute,
        );
      });
    }
  }

  Future<void> _saveSession() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a course'), backgroundColor: AppTheme.danger));
      return;
    }
    if (_selectedBatchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a batch'), backgroundColor: AppTheme.danger));
      return;
    }
    if (_scheduledAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a date'), backgroundColor: AppTheme.danger));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'start_time': _scheduledAt!.toIso8601String(),
      'batch_id': _selectedBatchId,
    };

    try {
      final response = widget.session == null
          ? await AdminApiService.createLiveSession(_selectedCourseId!, payload)
          : await AdminApiService.updateLiveSession(widget.session!['id'], payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(widget.session == null ? 'Live Class Scheduled' : 'Live Class Updated'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = response.data;
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

  String _formatTime(String? time) {
    if (time == null) return '--:--';
    final parts = time.split(':');
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = parts.length > 1 ? parts[1] : '00';
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return '$displayHour:$minute $period';
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
                      key: ValueKey(_selectedCourseId ?? '__course__'),
                      initialValue: _selectedCourseId,
                      decoration: const InputDecoration(labelText: 'Select Course'),
                      dropdownColor: AppTheme.elevated,
                      items: _courses.map((c) => DropdownMenuItem<String>(
                        value: c['id'],
                        child: Text(c['title'] ?? 'Untitled', maxLines: 1, overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: widget.session == null ? (v) {
                        if (v != null) {
                          setState(() {
                            _selectedCourseId = v;
                            _selectedBatchId = null;
                            _selectedBatch = null;
                            _batches = [];
                          });
                          _fetchBatches(v);
                        }
                      } : null,
                      validator: (v) => v == null ? 'Course is required' : null,
                    ),
                    if (_coursesError != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(_coursesError!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
                      ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      key: ValueKey(_selectedBatchId ?? '__batch__'),
                      initialValue: _selectedBatchId,
                      decoration: const InputDecoration(labelText: 'Select Batch'),
                      dropdownColor: AppTheme.elevated,
                      items: _batches.map((b) => DropdownMenuItem<String>(
                        value: b['id'],
                        child: Text(b['name'] ?? 'Unnamed Batch', maxLines: 1, overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: widget.session == null ? (v) {
                        if (v != null) {
                          final batch = _batches.firstWhere((b) => b['id'] == v, orElse: () => null);
                          if (batch == null) return;
                          setState(() {
                            _selectedBatchId = v;
                            _selectedBatch = batch;
                          });
                          _applyBatchTiming(batch);
                        }
                      } : null,
                      validator: (v) => v == null ? 'Batch is required' : null,
                    ),
                    if (_batchesError != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(_batchesError!, style: const TextStyle(color: AppTheme.danger, fontSize: 12)),
                      ),
                    if (_selectedBatch != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.elevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.schedule, color: AppTheme.danger, size: 16),
                                const SizedBox(width: 8),
                                Text(
                                  'Batch Schedule',
                                  style: TextStyle(color: Colors.white.withAlpha(204), fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (_selectedBatch!['class_days'] != null)
                              _buildInfoRow('Days', _selectedBatch!['class_days']),
                            if (_selectedBatch!['class_start_time'] != null)
                              _buildInfoRow('Start', _formatTime(_selectedBatch!['class_start_time'])),
                            if (_selectedBatch!['class_end_time'] != null)
                              _buildInfoRow('End', _formatTime(_selectedBatch!['class_end_time'])),
                          ],
                        ),
                      ),
                    ],
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
                    Row(
                      children: [
                        Expanded(
                          child: ListTile(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: AppTheme.border),
                            ),
                            tileColor: AppTheme.elevated,
                            leading: const Icon(Icons.calendar_month, color: AppTheme.danger),
                            title: Text(
                              _scheduledAt == null
                                  ? 'Select Date'
                                  : '${_scheduledAt!.year}-${_scheduledAt!.month.toString().padLeft(2, '0')}-${_scheduledAt!.day.toString().padLeft(2, '0')}'
                            ),
                            trailing: const Icon(Icons.edit, size: 20),
                            onTap: _selectDate,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ListTile(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: AppTheme.border),
                            ),
                            tileColor: AppTheme.elevated,
                            leading: const Icon(Icons.access_time, color: AppTheme.danger),
                            title: Text(
                              _scheduledAt == null
                                  ? 'Select Time'
                                  : '${_scheduledAt!.hour.toString().padLeft(2, '0')}:${_scheduledAt!.minute.toString().padLeft(2, '0')}'
                            ),
                            trailing: const Icon(Icons.edit, size: 20),
                            onTap: _selectTime,
                          ),
                        ),
                      ],
                    ),
                    if (_scheduledAt != null && _selectedBatch?['class_start_time'] != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Batch time: ${_formatTime(_selectedBatch!['class_start_time'])}',
                        style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                      ),
                    ],
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 45,
            child: Text('$label:', style: TextStyle(color: Colors.white.withAlpha(153), fontSize: 12)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
