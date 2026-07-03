import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

class YagyaMitraScreen extends StatefulWidget {
  const YagyaMitraScreen({super.key});

  @override
  State<YagyaMitraScreen> createState() => _YagyaMitraScreenState();
}

class _YagyaMitraScreenState extends State<YagyaMitraScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isLoading = false;
  final ScrollController _scrollController = ScrollController();
  final String _sessionId = DateTime.now().millisecondsSinceEpoch.toString();
  
  List<dynamic> _aiModels = [];
  String? _selectedModelId;
  bool _isLoadingModels = false;

  @override
  void initState() {
    super.initState();
    _messages.add({
      'role': 'ai',
      'content': 'Namaste! Main Yagya Mitra hoon. Aaj main aapki kis prakar sahayata kar sakta hoon?'
    });
    _fetchAiModels();
  }

  Future<void> _fetchAiModels() async {
    if (!mounted) return;
    setState(() => _isLoadingModels = true);
    try {
      final response = await ApiService.getAiModels();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _aiModels = data['models'] ?? [];
            if (_aiModels.isNotEmpty) {
              final defaultModel = _aiModels.firstWhere((m) => m['is_default'] == 1, orElse: () => _aiModels.first);
              _selectedModelId = defaultModel['id'];
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to load AI models: $e');
    } finally {
      if (mounted) setState(() => _isLoadingModels = false);
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final response = await ApiService.sendAiMessage(text, _sessionId, modelId: _selectedModelId);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        String aiResponse = 'Kuch technical problem aa gayi hai.';
        if (data['suggestion'] != null) {
           aiResponse = data['suggestion']['reply'] ?? data['suggestion'].toString();
        } else if (data['reply'] != null) {
           aiResponse = data['reply'];
        }
        
        setState(() {
          _messages.add({'role': 'ai', 'content': aiResponse});
        });
      } else if (response.statusCode == 429) {
        setState(() {
          _messages.add({'role': 'ai', 'content': 'आपके AI क्रेडिट्स समाप्त हो गए हैं। कृपया अपने वॉलेट को रिचार्ज करें। (Insufficient AI Credits)'});
        });
      } else {
        try {
          final errorData = jsonDecode(response.body);
          setState(() {
            _messages.add({'role': 'ai', 'content': 'Error: ${errorData['error'] ?? 'Network Issue'}'});
          });
        } catch (_) {
          setState(() {
            _messages.add({'role': 'ai', 'content': 'Server Error: ${response.statusCode}'});
          });
        }
      }
    } catch (e) {
      setState(() {
        _messages.add({'role': 'ai', 'content': 'Server se connect nahi ho paya. $e'});
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.smart_toy_rounded, color: AppTheme.primary, size: 28),
            SizedBox(width: 12),
            Text('Yagya Mitra (AI)'),
          ],
        ),
        actions: [
          if (_isLoadingModels)
            const Center(child: Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))))
          else if (_aiModels.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedModelId,
                  dropdownColor: AppTheme.surface,
                  icon: const Icon(Icons.arrow_drop_down, color: AppTheme.textPrimary),
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      setState(() {
                        _selectedModelId = newValue;
                      });
                    }
                  },
                  items: _aiModels.map<DropdownMenuItem<String>>((dynamic model) {
                    return DropdownMenuItem<String>(
                      value: model['id'],
                      child: Text(model['name'] ?? 'AI Model'),
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
        backgroundColor: AppTheme.surface,
        elevation: 1,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isUser ? AppTheme.primary : AppTheme.elevated,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(20),
                        topRight: const Radius.circular(20),
                        bottomLeft: Radius.circular(isUser ? 20 : 0),
                        bottomRight: Radius.circular(isUser ? 0 : 20),
                      ),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    child: MarkdownBody(
                      data: msg['content'] ?? '',
                      styleSheet: MarkdownStyleSheet(
                        p: TextStyle(color: isUser ? Colors.white : AppTheme.textPrimary, fontSize: 15, height: 1.4),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: TextField(
                        controller: _messageController,
                        style: const TextStyle(color: AppTheme.textPrimary),
                        decoration: const InputDecoration(
                          hintText: 'Ask Yagya Mitra...',
                          hintStyle: TextStyle(color: AppTheme.muted),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: _sendMessage,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight]),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 24),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
