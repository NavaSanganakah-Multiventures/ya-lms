import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class LessonEditorScreen extends StatefulWidget {
  final Map<String, dynamic> course;
  final Map<String, dynamic>? lesson; // null if creating new

  const LessonEditorScreen({super.key, required this.course, this.lesson});

  @override
  State<LessonEditorScreen> createState() => _LessonEditorScreenState();
}

class _LessonEditorScreenState extends State<LessonEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isLoadingMeta = true;

  late TextEditingController _titleController;
  String _type = 'video';

  // Book selection
  List<dynamic> _books = [];
  String? _selectedBookId;

  // Chapter selection
  List<String> _existingChapters = [];
  String? _selectedChapter;
  bool _isNewChapter = false;
  late TextEditingController _newChapterController;

  bool get _isEditing => widget.lesson != null;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.lesson?['title'] ?? '');
    _newChapterController = TextEditingController();
    _type = widget.lesson?['type'] ?? 'video';

    if (widget.lesson != null) {
      _selectedBookId = widget.lesson!['book_id']?.toString();
      final existingChapter = widget.lesson!['chapter_title']?.toString();
      if (existingChapter != null && existingChapter.isNotEmpty) {
        _selectedChapter = existingChapter;
        _isNewChapter = false;
      } else {
        _isNewChapter = true;
      }
      _isLoadingMeta = false;
      // If editing, load books anyway for dropdown display
      _loadBooks();
    } else {
      _loadBooks();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _newChapterController.dispose();
    super.dispose();
  }

  Future<void> _loadBooks() async {
    setState(() => _isLoadingMeta = true);
    try {
      final response = await AdminApiService.getCourseBooks(widget.course['id']);
      if (response.statusCode == 200) {
        final data = response.data;
        final books = <dynamic>[];
        // Handle both array and {books: [...]} response
        if (data is List) {
          books.addAll(data);
        } else if (data['books'] is List) {
          books.addAll(data['books']);
        }
        setState(() {
          _books = books;
          _isLoadingMeta = false;
        });
        // Auto-select first book if none selected
        if (_selectedBookId == null && books.isNotEmpty) {
          _selectedBookId = books[0]['id'];
        }
        // Load chapters for the selected book
        if (_selectedBookId != null) {
          _loadChapters();
        }
      } else {
        setState(() => _isLoadingMeta = false);
      }
    } catch (_) {
      setState(() => _isLoadingMeta = false);
    }
  }

  Future<void> _loadChapters() async {
    if (_selectedBookId == null) return;
    try {
      final chapters = await AdminApiService.getCourseChapters(widget.course['id']);
      setState(() {
        _existingChapters = chapters;
      });
    } catch (_) {}
  }

  Future<void> _saveLesson() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedBookId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('कृपया एक पुस्तक चुनें (Please select a book)'), backgroundColor: AppTheme.danger)
      );
      return;
    }

    setState(() => _isLoading = true);

    String chapterTitle;
    if (_isNewChapter) {
      chapterTitle = _newChapterController.text.trim();
      if (chapterTitle.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('कृपया अध्याय का नाम दर्ज करें (Enter chapter name)'), backgroundColor: AppTheme.danger)
        );
        setState(() => _isLoading = false);
        return;
      }
    } else {
      chapterTitle = _selectedChapter ?? 'General';
    }

    final payload = {
      'title': _titleController.text.trim(),
      'chapter_title': chapterTitle,
      'type': _type,
      'book_id': _selectedBookId,
    };

    try {
      final response = widget.lesson == null
          ? await AdminApiService.createCourseLesson(widget.course['id'], payload)
          : await AdminApiService.updateCourseLesson(widget.course['id'], widget.lesson!['id'], payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lesson saved successfully'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = response.data;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to save lesson'), backgroundColor: AppTheme.danger)
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: AppTheme.danger)
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
        title: Text(_isEditing ? 'Edit Lesson' : 'Add Lesson'),
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
                    // ── Book Selector (only for new lessons) ──
                    if (_isLoadingMeta)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(16.0),
                        child: CircularProgressIndicator(color: AppTheme.primaryLight),
                      ))
                    else ...[
                      if (!_isEditing)
                        DropdownButtonFormField<String>(
                          value: _selectedBookId,
                          decoration: const InputDecoration(
                            labelText: 'पुस्तक (Book)',
                            helperText: 'इस पाठ को किस पुस्तक में जोड़ना है?',
                            helperStyle: TextStyle(color: AppTheme.muted, fontSize: 11),
                          ),
                          dropdownColor: AppTheme.elevated,
                          items: _books.map((b) => DropdownMenuItem<String>(
                            value: b['id'],
                            child: Text(b['title'] ?? 'Untitled Book', maxLines: 1, overflow: TextOverflow.ellipsis),
                          )).toList(),
                          onChanged: (v) {
                            if (v != null) {
                              setState(() {
                                _selectedBookId = v;
                                _selectedChapter = null;
                                _isNewChapter = false;
                                _existingChapters = [];
                              });
                              _loadChapters();
                            }
                          },
                          validator: (v) => v == null ? 'पुस्तक चुनें (Select a book)' : null,
                        ),
                    ],

                    if (_selectedBookId != null) ...[
                      const SizedBox(height: 16),

                      // ── Lesson Title ──
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(labelText: 'पाठ का शीर्षक (Lesson Title)'),
                        validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                      ),
                      const SizedBox(height: 16),

                      // ── Chapter Name (Dropdown + New Chapter) ──
                      if (!_isNewChapter) ...[
                        DropdownButtonFormField<String>(
                          value: (_existingChapters.contains(_selectedChapter)) ? _selectedChapter : null,
                          decoration: const InputDecoration(
                            labelText: 'अध्याय (Chapter)',
                            helperText: 'मौजूदा अध्याय में से चुनें या नया बनाएँ',
                            helperStyle: TextStyle(color: AppTheme.muted, fontSize: 11),
                          ),
                          dropdownColor: AppTheme.elevated,
                          items: [
                            ..._existingChapters.map((ch) => DropdownMenuItem<String>(
                              value: ch,
                              child: Text(ch, maxLines: 1, overflow: TextOverflow.ellipsis),
                            )),
                            const DropdownMenuItem<String>(
                              value: '__new__',
                              child: Row(
                                children: [
                                  Icon(Icons.add_circle_outline, color: AppTheme.primaryLight, size: 20),
                                  SizedBox(width: 8),
                                  Text('✨ नया अध्याय (New Chapter)', style: TextStyle(color: AppTheme.primaryLight)),
                                ],
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == '__new__') {
                              setState(() {
                                _isNewChapter = true;
                                _selectedChapter = null;
                              });
                            } else if (v != null) {
                              setState(() {
                                _selectedChapter = v;
                                _isNewChapter = false;
                              });
                            }
                          },
                          validator: (_existingChapters.isNotEmpty || _isNewChapter)
                              ? null
                              : (v) => v == null ? 'अध्याय चुनें या नया बनाएँ' : null,
                        ),
                      ],

                      if (_isNewChapter) ...[
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _newChapterController,
                                decoration: const InputDecoration(
                                  labelText: 'नया अध्याय नाम (New Chapter)',
                                  hintText: 'जैसे: अध्याय १, परिचय, ...',
                                ),
                                validator: (v) {
                                  if (_isNewChapter && (v == null || v.isEmpty)) {
                                    return 'अध्याय का नाम दर्ज करें';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.close, color: AppTheme.muted),
                              tooltip: 'मौजूदा अध्याय से चुनें',
                              onPressed: () => setState(() {
                                _isNewChapter = false;
                                _newChapterController.clear();
                              }),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),

                      // ── Media Type ──
                      DropdownButtonFormField<String>(
                        value: _type,
                        decoration: const InputDecoration(labelText: 'मीडिया प्रकार (Media Type)'),
                        dropdownColor: AppTheme.elevated,
                        items: const [
                          DropdownMenuItem(value: 'video', child: Text('Video')),
                          DropdownMenuItem(value: 'audio', child: Text('Audio')),
                          DropdownMenuItem(value: 'pdf', child: Text('PDF Document')),
                          DropdownMenuItem(value: 'recording', child: Text('Live Recording')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _type = v);
                        },
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: _saveLesson,
                        child: Text(_isEditing ? 'UPDATE LESSON' : 'ADD LESSON'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }
}
