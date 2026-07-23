import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class BookEditorScreen extends StatefulWidget {
  final Map<String, dynamic>? book;

  const BookEditorScreen({super.key, this.book});

  @override
  State<BookEditorScreen> createState() => _BookEditorScreenState();
}

class _BookEditorScreenState extends State<BookEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _titleHiController;
  late TextEditingController _descController;
  late TextEditingController _descHiController;
  late TextEditingController _authorController;
  late TextEditingController _priceController;
  late TextEditingController _walletPriceController;
  late TextEditingController _coverUrlController;
  bool _isSaving = false;

  bool get _isEditing => widget.book != null;

  @override
  void initState() {
    super.initState();
    final b = widget.book;
    _titleController = TextEditingController(text: b?['title'] ?? '');
    _titleHiController = TextEditingController(text: b?['title_hi'] ?? '');
    _descController = TextEditingController(text: b?['description'] ?? '');
    _descHiController = TextEditingController(text: b?['description_hi'] ?? '');
    _authorController = TextEditingController(text: b?['author'] ?? '');
    _priceController = TextEditingController(text: b?['price_rupees']?.toString() ?? '0');
    _walletPriceController = TextEditingController(text: b?['wallet_rupees']?.toString() ?? '0');
    _coverUrlController = TextEditingController(text: b?['cover_url'] ?? '');
  }

  @override
  void dispose() {
    _titleController.dispose();
    _titleHiController.dispose();
    _descController.dispose();
    _descHiController.dispose();
    _authorController.dispose();
    _priceController.dispose();
    _walletPriceController.dispose();
    _coverUrlController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final data = {
        'title': _titleController.text.trim(),
        'title_hi': _titleHiController.text.trim(),
        'description': _descController.text.trim(),
        'description_hi': _descHiController.text.trim(),
        'author': _authorController.text.trim(),
        'price_rupees': int.tryParse(_priceController.text.trim()) ?? 0,
        'wallet_rupees': int.tryParse(_walletPriceController.text.trim()) ?? 0,
        'cover_url': _coverUrlController.text.trim(),
      };

      final Response response;
      if (_isEditing) {
        response = await AdminApiService.updateBook(widget.book!['id'], data);
      } else {
        response = await AdminApiService.createBook(data);
      }

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEditing ? 'Book अपडेट हो गया' : 'Book बन गया')),
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
        title: Text(_isEditing ? 'Edit Book' : 'Create Book'),
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
            _sectionHeader('Book Info'),
            const SizedBox(height: 12),
            _buildField('Title (English) *', _titleController),
            const SizedBox(height: 12),
            _buildField('Title (हिंदी)', _titleHiController),
            const SizedBox(height: 12),
            _buildField('Author', _authorController),
            const SizedBox(height: 12),
            _buildField('Description (English)', _descController, maxLines: 3),
            const SizedBox(height: 12),
            _buildField('Description (हिंदी)', _descHiController, maxLines: 3),
            const SizedBox(height: 24),

            _sectionHeader('Pricing'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildField('Price (₹)', _priceController, keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: _buildField('Wallet Price (₹)', _walletPriceController, keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 24),

            _sectionHeader('Media'),
            const SizedBox(height: 12),
            _buildField('Cover Image URL', _coverUrlController),
            if (_coverUrlController.text.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    _coverUrlController.text,
                    height: 180,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 180,
                      color: AppTheme.elevated,
                      child: const Center(child: Text('Invalid image URL', style: TextStyle(color: AppTheme.muted))),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),

            Center(
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _save,
                icon: _isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.save_rounded),
                label: Text(_isEditing ? 'Update Book' : 'Create Book'),
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

  Widget _buildField(String label, TextEditingController controller, {int maxLines = 1, TextInputType? keyboardType}) {
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
    );
  }
}
