import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class ManageBooksScreen extends StatefulWidget {
  const ManageBooksScreen({super.key});

  @override
  State<ManageBooksScreen> createState() => _ManageBooksScreenState();
}

class _ManageBooksScreenState extends State<ManageBooksScreen> {
  bool _isLoading = true;
  List<dynamic> _books = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBooks();
  }

  Future<void> _fetchBooks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getBooks();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _books = List<dynamic>.from(data['books'] ?? data ?? []);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load books';
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

  Future<void> _deleteBook(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Delete Book'),
        content: const Text('Are you sure you want to delete this book?'),
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
      final response = await AdminApiService.deleteBook(id);
      if (response.statusCode == 200) {
        _fetchBooks();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete book')));
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
        title: const Text('Manage Books'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add book coming soon')));
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchBooks,
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
                      ElevatedButton(onPressed: _fetchBooks, child: const Text('Retry')),
                    ],
                  ),
                )
              : _books.isEmpty
                  ? const Center(
                      child: Text(
                        'No books found.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _books.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final book = _books[index];
                        final title = book['title'] ?? 'Untitled Book';

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
                                color: const Color(0x2238BDF8),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.book_rounded, color: AppTheme.info),
                            ),
                            title: Text(
                              title,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.delete, color: AppTheme.danger),
                                  onPressed: () => _deleteBook(book['id']),
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
