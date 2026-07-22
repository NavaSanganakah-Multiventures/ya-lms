import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';

class CourseBooksScreen extends StatefulWidget {
  final String courseId;
  final String courseTitle;

  const CourseBooksScreen({super.key, required this.courseId, required this.courseTitle});

  @override
  State<CourseBooksScreen> createState() => _CourseBooksScreenState();
}

class _CourseBooksScreenState extends State<CourseBooksScreen> {
  bool _isLoading = true;
  List<dynamic> _books = [];
  List<dynamic> _allBooks = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final results = await Future.wait([
        AdminApiService.getCourseBooks(widget.courseId),
        AdminApiService.getBooks(),
      ]);
      final courseBooksRes = results[0];
      final allBooksRes = results[1];

      if (courseBooksRes.statusCode == 200) {
        final decoded = jsonDecode(courseBooksRes.body);
        setState(() {
          _books = ApiUtils.extractList(decoded, 'books');
          _isLoading = false;
        });
      } else {
        setState(() { _error = 'Failed to load course books'; _isLoading = false; });
      }

      if (allBooksRes.statusCode == 200) {
        setState(() {
          _allBooks = ApiUtils.extractList(jsonDecode(allBooksRes.body), 'books');
        });
      }
    } catch (e) {
      setState(() { _error = 'Network error: $e'; _isLoading = false; });
    }
  }

  Future<void> _addBook() async {
    final available = _allBooks.where((b) => !_books.any((cb) => cb['id'] == b['id'])).toList();
    if (available.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No more books available to add')));
      return;
    }

    final selected = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => SimpleDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Add Book to Course', style: TextStyle(color: Colors.white)),
        children: available.map((book) {
          final title = book['title'] ?? 'Untitled';
          return SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, book),
            child: Text(title, style: const TextStyle(color: Colors.white)),
          );
        }).toList(),
      ),
    );

    if (selected == null) return;

    try {
      final res = await AdminApiService.addCourseBook(widget.courseId, selected['id']);
      if (res.statusCode == 200 || res.statusCode == 201) {
        _load();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Book added to course')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${jsonDecode(res.body)['error']}')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _removeBook(String bookId, String title) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Remove Book'),
        content: Text('Remove "$title" from this course?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove', style: TextStyle(color: AppTheme.danger))),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final res = await AdminApiService.removeCourseBook(widget.courseId, bookId);
      if (res.statusCode == 200) {
        _load();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to remove')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('Books: ${widget.courseTitle}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _addBook,
            tooltip: 'Add book',
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
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : _books.isEmpty
                  ? const Center(
                      child: Text('No books linked to this course.', style: TextStyle(color: AppTheme.muted, fontSize: 16)),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _books.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final book = _books[index];
                        final title = book['title'] ?? 'Untitled';
                        return Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: ListTile(
                            leading: Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0x2238BDF8),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.book_rounded, color: AppTheme.info),
                            ),
                            title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                            trailing: IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: AppTheme.danger),
                              onPressed: () => _removeBook(book['id'], title),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
