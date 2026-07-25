import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import 'batch_editor_screen.dart';
import 'batch_students_screen.dart';

class ManageBatchesScreen extends StatefulWidget {
  const ManageBatchesScreen({super.key});

  @override
  State<ManageBatchesScreen> createState() => _ManageBatchesScreenState();
}

class _ManageBatchesScreenState extends State<ManageBatchesScreen> {
  bool _isLoading = true;
  List<dynamic> _batches = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBatches();
  }

  Future<void> _fetchBatches() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getBatches();
      if (response.statusCode == 200) {
        final decoded = response.data;
        setState(() {
          _batches = ApiUtils.extractList(decoded, 'batches');
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load batches';
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

  Future<void> _deleteBatch(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Delete Batch'),
        content: const Text('Are you sure you want to delete this batch?'),
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
      final response = await AdminApiService.deleteBatch(id);
      if (response.statusCode == 200) {
        _fetchBatches();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete batch')));
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
        title: const Text('Manage Batches'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push<bool>(
                context,
                MaterialPageRoute(builder: (_) => const BatchEditorScreen()),
              );
              if (result == true) _fetchBatches();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchBatches,
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
                      ElevatedButton(onPressed: _fetchBatches, child: const Text('Retry')),
                    ],
                  ),
                )
              : _batches.isEmpty
                  ? const Center(
                      child: Text(
                        'No batches found.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _batches.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final batch = _batches[index];
                        final title = batch['name'] ?? batch['title'] ?? 'Untitled Batch';

                        return Material(
                          color: AppTheme.surface,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: AppTheme.border),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: const Color(0x2222C55E),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.group_work_rounded, color: AppTheme.success),
                            ),
                            title: Text(
                              title,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              maxLines: 2, overflow: TextOverflow.ellipsis,
                            ),
                            trailing: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit, color: AppTheme.primaryLight),
                                    onPressed: () async {
                                      final result = await Navigator.push<bool>(
                                        context,
                                        MaterialPageRoute(builder: (_) => BatchEditorScreen(batch: batch)),
                                      );
                                      if (result == true) _fetchBatches();
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.people_alt_rounded, color: AppTheme.info),
                                    onPressed: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => BatchStudentsScreen(batchId: batch['id'], batchName: title),
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete, color: AppTheme.danger),
                                    onPressed: () {
                                      final id = batch['id']?.toString();
                                      if (id != null && id.isNotEmpty) _deleteBatch(id);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
