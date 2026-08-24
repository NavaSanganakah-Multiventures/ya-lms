import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';

class YagyaMitraScreen extends StatefulWidget {
  YagyaMitraScreen({super.key});

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
  String? _modelsError;

  @override
  void initState() {
    super.initState();
    _messages.add({
      'role': 'ai',
      'content': 'Namaste! Main Yagya Mitra hoon. Aaj main aapki kis prakar sahayata kar sakta hoon?',
    });
    _fetchAiModels();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchAiModels() async {
    if (!mounted) return;
    setState(() => _isLoadingModels = true);
    try {
      final response = await ApiService.getAiModels();
      if (response.statusCode == 200) {
        final data = response.data;
        if (mounted) {
          setState(() {
            _aiModels = data['models'] ?? [];
            _modelsError = null;
            if (_aiModels.isNotEmpty) {
              final defaultModel = _aiModels.firstWhere(
                (m) => m['is_default'] == 1,
                orElse: () => _aiModels.first,
              );
              _selectedModelId = defaultModel['id']?.toString();
            }
          });
        }
      } else {
        if (mounted) setState(() => _modelsError = 'AI models load nahi ho paye (${response.statusCode})');
      }
    } catch (e) {
      debugPrint('Failed to load AI models: $e');
      if (mounted) setState(() => _modelsError = 'AI models load nahi ho paye: $e');
    } finally {
      if (mounted) setState(() => _isLoadingModels = false);
    }
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
    if (_isLoading) return;

    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      if (_messages.length > 200) {
        _messages.removeRange(0, _messages.length - 200);
      }
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final response = await ApiService.sendAiMessage(text, _sessionId, modelId: _selectedModelId);
      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = response.data;
        String aiResponse = 'Kuch technical problem aa gayi hai.';
        if (data['suggestion'] != null) {
          if (data['suggestion'] is Map) {
            aiResponse = data['suggestion']['reply'] ?? data['suggestion'].toString();
          } else {
            aiResponse = data['suggestion'].toString();
          }
        } else if (data['reply'] != null) {
          aiResponse = data['reply'];
        }
        setState(() => _messages.add({'role': 'ai', 'content': aiResponse}));
      } else if (response.statusCode == 429) {
        setState(() {
          _messages.add({
            'role': 'ai',
            'content': 'आपके AI क्रेडिट्स समाप्त हो गए हैं। कृपया अपने वॉलेट को रिचार्ज करें। (Insufficient AI Credits)',
          });
        });
      } else {
        final errorData = response.data;
        setState(() {
          _messages.add({
            'role': 'ai',
            'content': 'Error: ${errorData['error'] ?? 'Network Issue'}',
          });
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add({'role': 'ai', 'content': 'Server se connect nahi ho paya. $e'});
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundOf(context),
      appBar: AppBar(
        backgroundColor: AppTheme.backgroundOf(context),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppTheme.space2 + 4),
              decoration: BoxDecoration(
                gradient: AppTheme.premiumGradient,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: AppTheme.surface, size: 22),
            ),
            const SizedBox(width: AppTheme.space3),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Yagya Mitra',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                      ),
                ),
                Text(
                  'AI Study Assistant',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.mutedOf(context),
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (_isLoadingModels)
            const Padding(
              padding: EdgeInsets.only(right: AppTheme.space4),
              child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else if (_modelsError != null)
            IconButton(
              icon: const Icon(Icons.refresh, color: AppTheme.danger),
              tooltip: 'Retry loading models',
              onPressed: _fetchAiModels,
            )
          else if (_aiModels.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: AppTheme.space4),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.space3, vertical: AppTheme.space1 + 2),
                decoration: BoxDecoration(
                  color: AppTheme.elevatedOf(context),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(color: AppTheme.borderOf(context)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedModelId,
                    dropdownColor: AppTheme.surfaceOf(context),
                    icon: const Icon(Icons.arrow_drop_down, color: AppTheme.primary, size: 20),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppTheme.textPrimaryOf(context),
                          fontSize: 13,
                        ),
                    isDense: true,
                    onChanged: (String? newValue) {
                      if (newValue != null) setState(() => _selectedModelId = newValue);
                    },
                    items: _aiModels.map<DropdownMenuItem<String>>((dynamic model) {
                      return DropdownMenuItem<String>(
                        value: model['id']?.toString(),
                        child: Text(model['name'] ?? 'AI Model', style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ResponsiveLayout(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(AppTheme.space4),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isUser = msg['role'] == 'user';
                  return ChatBubble(
                    content: msg['content'] ?? '',
                    isUser: isUser,
                  ).animate().fadeIn(duration: 250.ms);
                },
              ),
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppTheme.space2),
              child: ChatBubble(content: '', isLoading: true, isUser: false),
            ),
          Container(
            padding: const EdgeInsets.fromLTRB(AppTheme.space4, AppTheme.space2, AppTheme.space4, AppTheme.space4),
            decoration: BoxDecoration(
              color: AppTheme.surfaceOf(context),
              border: Border(top: BorderSide(color: AppTheme.borderOf(context)))
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: YuvaInput(
                      controller: _messageController,
                      hint: 'Ask Yagya Mitra...',
                      suffixIcon: Icons.send_rounded,
                      onSuffixTap: _isLoading ? null : _sendMessage,
                      onSubmitted: (_) => _sendMessage(),
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