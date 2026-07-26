import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/admin_api_service.dart';
import '../services/real_time_service.dart';

class ManageSecretsScreen extends StatefulWidget {
  const ManageSecretsScreen({super.key});

  @override
  State<ManageSecretsScreen> createState() => _ManageSecretsScreenState();
}

class _ManageSecretsScreenState extends State<ManageSecretsScreen> {
  Map<String, String> _secrets = {};
  Map<String, String> _filteredSecrets = {};
  List<String> _maskedKeys = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String? _editingKey;
  final _editController = TextEditingController();
  final _newKeyController = TextEditingController();
  final _newValueController = TextEditingController();
  bool _showAddForm = false;
  String? _savingKey;
  String? _message;
  bool _isError = false;
  StreamSubscription? _realtimeSub;
  bool _wsConnected = false;

  List<MapEntry<String, String>> get _entries => _filteredSecrets.entries.toList();

  @override
  void initState() {
    super.initState();
    _fetchSecrets();
    _connectRealtime();
  }

  void _connectRealtime() {
    AdminRealTimeService.instance.connect();
    AdminRealTimeService.instance.subscribe('admin_secrets');
    _realtimeSub = AdminRealTimeService.instance.dataStream.listen((event) {
      if (event['channel'] == 'admin_secrets') {
        _fetchSecrets();
      }
    });
    _wsConnected = AdminRealTimeService.instance.isConnected;
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    _editController.dispose();
    _newKeyController.dispose();
    _newValueController.dispose();
    super.dispose();
  }

  Future<void> _fetchSecrets() async {
    try {
      final secrets = await AdminApiService.getSecrets();
      final maskedKeys = await AdminApiService.getMaskedKeys();
      if (mounted) {
        setState(() {
          _secrets = secrets;
          _maskedKeys = maskedKeys;
          _applyFilter();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyFilter() {
    if (_searchQuery.isEmpty) {
      _filteredSecrets = Map.from(_secrets);
    } else {
      final q = _searchQuery.toLowerCase();
      _filteredSecrets = _secrets.entries
          .where((e) => e.key.toLowerCase().contains(q) || e.value.toLowerCase().contains(q))
          .fold<Map<String, String>>({}, (map, e) {
        map[e.key] = e.value;
        return map;
      });
    }
  }

  String _displayValue(String key, String value) {
    if (_maskedKeys.contains(key)) {
      return value.length > 8 ? '${value.substring(0, 4)}****' : '****';
    }
    return value;
  }

  void _showMsg(String msg, {bool isError = false}) {
    setState(() { _message = msg; _isError = isError; });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() { _message = null; });
    });
  }

  Future<void> _toggleMask(String key, bool isCurrentlyMasked) async {
    try {
      await AdminApiService.toggleMask(key, !isCurrentlyMasked);
      setState(() {
        if (isCurrentlyMasked) {
          _maskedKeys.remove(key);
        } else {
          _maskedKeys.add(key);
        }
      });
    } catch (e) {
      _showMsg('Failed to toggle: $e', isError: true);
    }
  }

  Future<void> _saveSecret(String key, String value) async {
    setState(() => _savingKey = key);
    try {
      await AdminApiService.putSecret(key, value);
      setState(() => _editingKey = null);
      _showMsg('"$key" saved!');
    } catch (e) {
      _showMsg('Failed to save: $e', isError: true);
    }
    setState(() => _savingKey = null);
  }

  Future<void> _deleteSecret(String key) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Delete Secret', style: TextStyle(color: Colors.white)),
        content: Text('Delete "$key"?', style: const TextStyle(color: AppTheme.muted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppTheme.danger))),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _savingKey = key);
    try {
      await AdminApiService.deleteSecret(key);
      _showMsg('"$key" deleted!');
    } catch (e) {
      _showMsg('Failed to delete: $e', isError: true);
    }
    setState(() => _savingKey = null);
  }

  Future<void> _addSecret() async {
    final key = _newKeyController.text.trim();
    if (key.isEmpty) return;
    setState(() => _savingKey = '__new__');
    try {
      await AdminApiService.putSecret(key, _newValueController.text);
      _newKeyController.clear();
      _newValueController.clear();
      setState(() => _showAddForm = false);
      _showMsg('"$key" added!');
    } catch (e) {
      _showMsg('Failed to add: $e', isError: true);
    }
    setState(() => _savingKey = null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('KV Secrets'),
        actions: [
          _wsConnected
              ? const Padding(
                  padding: EdgeInsets.only(right: 12),
                  child: Icon(Icons.wifi, color: AppTheme.success, size: 20),
                )
              : const Padding(
                  padding: EdgeInsets.only(right: 12),
                  child: Icon(Icons.wifi_off, color: AppTheme.danger, size: 20),
                ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchSecrets,
          ),
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => setState(() => _showAddForm = !_showAddForm),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_message != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: _isError ? AppTheme.danger.withOpacity(0.2) : AppTheme.success.withOpacity(0.2),
              child: Text(
                _message!,
                style: TextStyle(
                  color: _isError ? AppTheme.danger : AppTheme.success,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          if (_showAddForm)
            Container(
              padding: const EdgeInsets.all(16),
              color: AppTheme.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('New Secret', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _newKeyController,
                    decoration: InputDecoration(
                      hintText: 'SECRET_KEY_NAME',
                      hintStyle: const TextStyle(color: AppTheme.muted, fontFamily: 'monospace', fontSize: 13),
                      filled: true,
                      fillColor: AppTheme.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                    style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _newValueController,
                    decoration: InputDecoration(
                      hintText: 'value',
                      hintStyle: const TextStyle(color: AppTheme.muted, fontFamily: 'monospace', fontSize: 13),
                      filled: true,
                      fillColor: AppTheme.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                    style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () { setState(() { _showAddForm = false; _newKeyController.clear(); _newValueController.clear(); }); },
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _savingKey == '__new__' ? null : _addSecret,
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryLight),
                        child: _savingKey == '__new__'
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Add Secret', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) { setState(() { _searchQuery = v; _applyFilter(); }); },
              decoration: InputDecoration(
                hintText: 'Search keys or values...',
                hintStyle: const TextStyle(color: AppTheme.muted, fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.muted, size: 20),
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _entries.isEmpty
                    ? const Center(child: Text('No secrets found', style: TextStyle(color: AppTheme.muted)))
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _entries.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 6),
                        itemBuilder: (context, index) {
                          final entry = _entries[index];
                          final isEditing = _editingKey == entry.key;
                          final isMasked = _maskedKeys.contains(entry.key);
                          return Container(
                            decoration: BoxDecoration(
                              color: AppTheme.surface,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryLight.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        entry.key,
                                        style: const TextStyle(color: AppTheme.primaryLight, fontFamily: 'monospace', fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    if (isMasked)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.success.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text('sensitive', style: TextStyle(color: AppTheme.success, fontSize: 9, fontWeight: FontWeight.bold)),
                                      ),
                                    const Spacer(),
                                    if (isEditing)
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: _savingKey == entry.key
                                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                                : const Icon(Icons.check_rounded, color: AppTheme.success, size: 20),
                                            onPressed: _savingKey == entry.key ? null : () => _saveSecret(entry.key, _editController.text),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.close_rounded, color: AppTheme.muted, size: 20),
                                            onPressed: () => setState(() => _editingKey = null),
                                          ),
                                        ],
                                      )
                                    else
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: Icon(
                                              isMasked ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                              color: isMasked ? AppTheme.success : AppTheme.muted,
                                              size: 18,
                                            ),
                                            onPressed: () => _toggleMask(entry.key, isMasked),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.edit_rounded, color: AppTheme.muted, size: 18),
                                            onPressed: () {
                                              _editController.text = entry.value;
                                              setState(() => _editingKey = entry.key);
                                            },
                                          ),
                                          IconButton(
                                            icon: _savingKey == entry.key
                                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.danger))
                                                : const Icon(Icons.delete_rounded, color: AppTheme.danger, size: 18),
                                            onPressed: _savingKey == entry.key ? null : () => _deleteSecret(entry.key),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                if (isEditing)
                                  TextField(
                                    controller: _editController,
                                    style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 13),
                                    decoration: InputDecoration(
                                      filled: true,
                                      fillColor: AppTheme.background,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    ),
                                  )
                                else
                                  GestureDetector(
                                    onLongPress: () {
                                      Clipboard.setData(ClipboardData(text: entry.value));
                                      _showMsg('Value copied!');
                                    },
                                    child: Text(
                                      _displayValue(entry.key, entry.value),
                                      style: const TextStyle(color: Colors.white70, fontFamily: 'monospace', fontSize: 13),
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'Total: ${_secrets.length} secrets | ${_maskedKeys.length} sensitive',
              style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
    );
  }
}
