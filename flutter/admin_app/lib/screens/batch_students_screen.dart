import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';

class BatchStudentsScreen extends StatefulWidget {
  final String batchId;
  final String batchName;

  const BatchStudentsScreen({super.key, required this.batchId, required this.batchName});

  @override
  State<BatchStudentsScreen> createState() => _BatchStudentsScreenState();
}

class _BatchStudentsScreenState extends State<BatchStudentsScreen> {
  bool _isLoading = true;
  List<dynamic> _students = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchStudents();
  }

  Future<void> _fetchStudents() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final response = await AdminApiService.getBatchStudents(widget.batchId);
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _students = ApiUtils.extractList(decoded, 'students');
          _isLoading = false;
        });
      } else {
        setState(() { _error = 'Failed to load students'; _isLoading = false; });
      }
    } catch (e) {
      setState(() { _error = 'Network error: $e'; _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text('Students: ${widget.batchName}')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryLight))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _fetchStudents, child: const Text('Retry')),
                    ],
                  ),
                )
              : _students.isEmpty
                  ? const Center(
                      child: Text('No students enrolled.', style: TextStyle(color: AppTheme.muted, fontSize: 16)),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _students.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final s = _students[index];
                        final name = s['full_name'] ?? s['name'] ?? 'Unknown';
                        final email = s['email'] ?? '';
                        return Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppTheme.elevated,
                              child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: const TextStyle(color: AppTheme.primaryLight)),
                            ),
                            title: Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(email, style: const TextStyle(color: AppTheme.muted, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        );
                      },
                    ),
    );
  }
}
