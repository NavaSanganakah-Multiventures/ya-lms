import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class ManageAiModelsScreen extends StatefulWidget {
  const ManageAiModelsScreen({super.key});

  @override
  State<ManageAiModelsScreen> createState() => _ManageAiModelsScreenState();
}

class _ManageAiModelsScreenState extends State<ManageAiModelsScreen> {
  bool _isLoading = true;
  List<dynamic> _models = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchModels();
  }

  Future<void> _fetchModels() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getAiModels();
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _models = List<dynamic>.from(decoded);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load AI models';
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

  Future<void> _deleteModel(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Delete Model', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to delete this AI model?', style: TextStyle(color: Colors.white70)),
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
      final response = await AdminApiService.deleteAiModel(id);
      if (response.statusCode == 200) {
        _fetchModels();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete model')));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      setState(() => _isLoading = false);
    }
  }

  void _showModelForm([Map<String, dynamic>? model]) {
    final idController = TextEditingController(text: model?['id'] ?? '');
    final nameController = TextEditingController(text: model?['name'] ?? '');
    final endpointController = TextEditingController(text: model?['endpoint'] ?? 'chat/completions');
    final systemPromptController = TextEditingController(text: model?['system_prompt'] ?? '');
    final fallbackController = TextEditingController(text: model?['fallback_model_ids'] ?? '[]');
    
    String provider = model?['provider'] ?? 'workers-ai';
    bool isActive = (model?['is_active'] ?? 1) == 1;
    bool isDefault = (model?['is_default'] ?? 0) == 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 16, right: 16, top: 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(model == null ? 'Add New AI Model' : 'Edit AI Model', 
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Name', labelStyle: TextStyle(color: Colors.white70)),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: idController,
                      style: const TextStyle(color: Colors.white),
                      enabled: model == null, // disable ID editing
                      decoration: const InputDecoration(labelText: 'Model ID', labelStyle: TextStyle(color: Colors.white70)),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: provider,
                      dropdownColor: AppTheme.surface,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Provider', labelStyle: TextStyle(color: Colors.white70)),
                      items: const [
                        DropdownMenuItem(value: 'workers-ai', child: Text('Cloudflare Workers AI')),
                        DropdownMenuItem(value: 'openai', child: Text('OpenAI')),
                        DropdownMenuItem(value: 'anthropic', child: Text('Anthropic')),
                        DropdownMenuItem(value: 'google-ai-studio', child: Text('Google AI Studio')),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => provider = val);
                      },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: endpointController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Endpoint', labelStyle: TextStyle(color: Colors.white70)),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: fallbackController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Fallback Model IDs (JSON array)', labelStyle: TextStyle(color: Colors.white70)),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: systemPromptController,
                      style: const TextStyle(color: Colors.white),
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'System Prompt (Optional)', labelStyle: TextStyle(color: Colors.white70)),
                    ),
                    const SizedBox(height: 10),
                    SwitchListTile(
                      title: const Text('Active', style: TextStyle(color: Colors.white)),
                      value: isActive,
                      activeColor: AppTheme.primary,
                      onChanged: (val) => setModalState(() => isActive = val),
                    ),
                    SwitchListTile(
                      title: const Text('Default Model', style: TextStyle(color: Colors.white)),
                      value: isDefault,
                      activeColor: AppTheme.primary,
                      onChanged: (val) => setModalState(() => isDefault = val),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, padding: const EdgeInsets.symmetric(vertical: 16)),
                      onPressed: () async {
                        final data = {
                          'id': idController.text,
                          'name': nameController.text,
                          'provider': provider,
                          'endpoint': endpointController.text,
                          'system_prompt': systemPromptController.text,
                          'fallback_model_ids': fallbackController.text,
                          'is_active': isActive ? 1 : 0,
                          'is_default': isDefault ? 1 : 0,
                        };
                        
                        Navigator.pop(ctx);
                        setState(() => _isLoading = true);
                        
                        try {
                          final response = model == null 
                              ? await AdminApiService.createAiModel(data)
                              : await AdminApiService.updateAiModel(model['id'], data);
                              
                          if (response.statusCode == 200 || response.statusCode == 201) {
                            _fetchModels();
                          } else {
                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save AI model')));
                            setState(() => _isLoading = false);
                          }
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                          setState(() => _isLoading = false);
                        }
                      },
                      child: Text(model == null ? 'Create' : 'Update', style: const TextStyle(color: Colors.white)),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Manage AI Models'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showModelForm(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchModels,
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                        child: const Text('Retry', style: TextStyle(color: Colors.white)),
                      )
                    ],
                  ),
                )
              : _models.isEmpty
                  ? const Center(child: Text('No AI Models found', style: TextStyle(color: Colors.white70)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _models.length,
                      itemBuilder: (context, index) {
                        final model = _models[index];
                        final isActive = (model['is_active'] ?? 0) == 1;
                        final isDefault = (model['is_default'] ?? 0) == 1;
                        
                        return Card(
                          color: AppTheme.surface,
                          margin: const EdgeInsets.only(bottom: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        model['name'] ?? 'Unknown',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                    if (isDefault)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(12)),
                                        child: const Text('Default', style: TextStyle(color: Colors.white, fontSize: 10)),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text('ID: ${model['id']}', style: const TextStyle(color: Colors.white70, fontSize: 14)),
                                Text('Provider: ${model['provider']}', style: const TextStyle(color: Colors.white70, fontSize: 14)),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(Icons.circle, size: 10, color: isActive ? Colors.green : Colors.red),
                                    const SizedBox(width: 4),
                                    Text(isActive ? 'Active' : 'Inactive', style: TextStyle(color: isActive ? Colors.green : Colors.red, fontSize: 12)),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _showModelForm(model),
                                      icon: const Icon(Icons.edit, size: 18, color: AppTheme.primary),
                                      label: const Text('Edit', style: TextStyle(color: AppTheme.primary)),
                                    ),
                                    TextButton.icon(
                                      onPressed: () => _deleteModel(model['id']),
                                      icon: const Icon(Icons.delete, size: 18, color: AppTheme.danger),
                                      label: const Text('Delete', style: TextStyle(color: AppTheme.danger)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
