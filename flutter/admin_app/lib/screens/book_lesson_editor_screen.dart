import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

class BookLessonEditorScreen extends StatefulWidget {
  final Map<String, dynamic> book;
  final Map<String, dynamic>? lesson; // null if creating new

  const BookLessonEditorScreen({super.key, required this.book, this.lesson});

  @override
  State<BookLessonEditorScreen> createState() => _BookLessonEditorScreenState();
}

class _BookLessonEditorScreenState extends State<BookLessonEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isLoadingMeta = true;

  late TextEditingController _titleController;
  String _type = 'video';

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
      final existingChapter = widget.lesson!['chapter_title'] as String?;
      if (existingChapter != null && existingChapter.isNotEmpty) {
        _selectedChapter = existingChapter;
        _isNewChapter = false;
      } else {
        _isNewChapter = true;
      }
    }
    _loadChapters();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _newChapterController.dispose();
    super.dispose();
  }

  Future<void> _loadChapters() async {
    setState(() => _isLoadingMeta = true);
    try {
      final chapters = await AdminApiService.getBookChapters(widget.book['id']);
      setState(() {
        _existingChapters = chapters;
        _isLoadingMeta = false;
      });
    } catch (_) {
      setState(() => _isLoadingMeta = false);
    }
  }

  Future<void> _saveLesson() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    String chapterTitle;
    if (_isNewChapter) {
      chapterTitle = _newChapterController.text.trim();
      if (chapterTitle.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('कृपया अध्याय का नाम दर्ज करें'), backgroundColor: AppTheme.danger)
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
    };

    try {
      final response = widget.lesson == null
          ? await AdminApiService.createBookLesson(widget.book['id'], payload)
          : await AdminApiService.updateBookLesson(widget.book['id'], widget.lesson!['id'], payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lesson saved successfully'), backgroundColor: AppTheme.success)
          );
        }
      } else {
        if (mounted) {
          final data = jsonDecode(response.body);
          if (data is! Map) return;
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
        title: Text(_isEditing ? 'पाठ संपादित करें (Edit Lesson)' : 'पाठ जोड़ें (Add Lesson)'),
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
                    // ── Book Info (read-only) ──
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.elevated,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.book_rounded, color: AppTheme.info, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              widget.book['title'] ?? 'Untitled Book',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Lesson Title ──
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'पाठ का शीर्षक (Lesson Title)'),
                      validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                    ),
                    const SizedBox(height: 16),

                    // ── Chapter Name ──
                    if (_isLoadingMeta)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: CircularProgressIndicator(color: AppTheme.primaryLight, strokeWidth: 2),
                      ))
                    else ...[
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
                ),
              ),
            ),
    );
  }
}
