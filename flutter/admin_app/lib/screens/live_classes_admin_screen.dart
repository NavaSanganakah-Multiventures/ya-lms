import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import 'live_class_editor_screen.dart';

class LiveClassesAdminScreen extends StatefulWidget {
  const LiveClassesAdminScreen({super.key});

  @override
  State<LiveClassesAdminScreen> createState() => _LiveClassesAdminScreenState();
}

class _LiveClassesAdminScreenState extends State<LiveClassesAdminScreen> {
  bool _isLoading = true;
  List<dynamic> _classes = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLiveClasses();
  }

  Future<void> _fetchLiveClasses() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getLiveClasses();
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _classes = decoded is Map
              ? List<dynamic>.from(decoded['sessions'] ?? [])
              : decoded is List
                  ? List<dynamic>.from(decoded)
                  : [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load live classes';
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

  Future<void> _deleteClass(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Delete Class'),
        content: const Text('Are you sure you want to delete this live class?'),
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
      final response = await AdminApiService.deleteLiveSession(id);
      if (response.statusCode == 200) {
        _fetchLiveClasses();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete')));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Live Classes'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LiveClassEditorScreen()),
              );
              if (result == true) {
                _fetchLiveClasses();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchLiveClasses,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.danger))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
                        onPressed: _fetchLiveClasses,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _classes.isEmpty
                  ? const Center(
                      child: Text(
                        'No live classes scheduled.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _classes.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final session = _classes[index];
                        final title = session['title'] ?? 'Untitled Class';
                        final status = session['status'] ?? 'scheduled';
                        
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
                                color: const Color(0x22C4314B),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.video_call_rounded, color: AppTheme.danger),
                            ),
                            title: Text(
                              title,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: status == 'live' ? AppTheme.danger.withAlpha(36) : AppTheme.info.withAlpha(36),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      status.toString().toUpperCase(),
                                      style: TextStyle(
                                        color: status == 'live' ? AppTheme.danger : AppTheme.info,
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
                                if (status == 'live')
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.danger,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                      minimumSize: const Size(60, 36),
                                    ),
                                    onPressed: () {
                                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Joining class... (Video streaming view to be added)')));
                                    },
                                    child: const Text('JOIN'),
                                  ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: AppTheme.danger),
                                  onPressed: () => _deleteClass(session['id']),
                                ),
                              ],
                            ),
                            onTap: () async {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => LiveClassEditorScreen(session: session)),
                              );
                              if (result == true) {
                                _fetchLiveClasses();
                              }
                            },
                          ),
                        );
                      },
                    ),
    );
  }
}
