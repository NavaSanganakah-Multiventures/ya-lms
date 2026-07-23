import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class PushNotificationScreen extends StatefulWidget {
  const PushNotificationScreen({super.key});

  @override
  State<PushNotificationScreen> createState() => _PushNotificationScreenState();
}

class _PushNotificationScreenState extends State<PushNotificationScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  final _urlController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _sendNotification() async {
    if (!_formKey.currentState!.validate()) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Send Notification'),
        content: const Text('Are you sure you want to send this push notification to all users?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Send', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    final payload = {
      'title': _titleController.text.trim(),
      'body': _messageController.text.trim(),
      'all': true,
      'data': {
        'url': _urlController.text.trim().isEmpty ? '/' : _urlController.text.trim(),
      },
    };

    try {
      final response = await AdminApiService.sendPushNotification(payload);

      if (response.statusCode == 200) {
        if (mounted) {
          _titleController.clear();
          _messageController.clear();
          _urlController.clear();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Notification sent successfully!'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = response.data;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to send notification'), backgroundColor: AppTheme.danger)
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger)
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
        title: const Text('Push Notifications'),
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
                    const Text(
                      'Send Global Notification',
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'This will send an FCM push notification to all subscribed devices.',
                      style: TextStyle(color: AppTheme.muted),
                    ),
                    const SizedBox(height: 32),

                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Notification Title',
                        hintText: 'e.g. New Live Class Today!',
                      ),
                      validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _messageController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Message Body',
                        hintText: 'Enter the message content...',
                      ),
                      validator: (v) => v == null || v.isEmpty ? 'Message is required' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _urlController,
                      decoration: const InputDecoration(
                        labelText: 'Action URL (Optional)',
                        hintText: 'e.g. /courses or /live',
                      ),
                    ),
                    const SizedBox(height: 32),

                    ElevatedButton.icon(
                      onPressed: _sendNotification,
                      icon: const Icon(Icons.send),
                      label: const Text('SEND TO ALL USERS'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
