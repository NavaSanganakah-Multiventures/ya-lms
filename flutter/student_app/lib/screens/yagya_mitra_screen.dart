import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

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
 final data = response.data;
 if (mounted) {
 setState(() {
 _aiModels = data['models'] ?? [];
 _modelsError = null;
 if (_aiModels.isNotEmpty) {
 final defaultModel = _aiModels.firstWhere((m) => m['is_default'] == 1, orElse: () => _aiModels.first);
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
 duration: Duration(milliseconds: 300),
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
 try {
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
 
 setState(() {
 _messages.add({'role': 'ai', 'content': aiResponse});
 });
 } catch (e) {
 setState(() {
 _messages.add({'role': 'ai', 'content': 'Error: Server se sahi response nahi mila.'});
 });
 }
 } else if (response.statusCode == 429) {
 setState(() {
 _messages.add({'role': 'ai', 'content': 'आपके AI क्रेडिट्स समाप्त हो गए हैं। कृपया अपने वॉलेट को रिचार्ज करें। (Insufficient AI Credits)'});
 });
 } else {
 try {
 final errorData = response.data;
 setState(() {
 _messages.add({'role': 'ai', 'content': 'Error: ${errorData['error'] ?? 'Network Issue'}'});
 });
 } catch (e) {
 setState(() {
 _messages.add({'role': 'ai', 'content': 'Error: Server par kuch samasya hai (Status Code: ${response.statusCode})'});
 });
 }
 }
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _messages.add({'role': 'ai', 'content': 'Server se connect nahi ho paya. $e'});
 });
 } finally {
 if (mounted) {
 setState(() {
 _isLoading = false;
 });
 }
 _scrollToBottom();
 }
 }

 @override
 Widget build(BuildContext context) {

 return Container(
 color: AppTheme.backgroundOf(context),
 child: SafeArea(
 child: Column(
 children: [
 Container(
 padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))],
 ),
 child: Row(
 mainAxisAlignment: MainAxisAlignment.spaceBetween,
 children: [
 Row(
 children: [
 Container(
 padding: EdgeInsets.all(8),
 decoration: BoxDecoration(
 gradient: AppTheme.sacredGradient,
 borderRadius: BorderRadius.circular(14),
 ),
 child: Icon(Icons.smart_toy_rounded, color: Colors.white, size: 20),
 ),
 SizedBox(width: 12),
 Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text('Yagya Mitra', style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 17, fontWeight: FontWeight.w900)),
 Text('AI Study Assistant', style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 11, fontWeight: FontWeight.w600)),
 ],
 ),
 ],
 ),
 Row(
 children: [
 if (_isLoadingModels)
 SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))
 else if (_modelsError != null)
 IconButton(
 icon: Icon(Icons.refresh, color: AppTheme.danger),
 tooltip: 'Retry loading models',
 onPressed: _fetchAiModels,
 padding: EdgeInsets.zero,
 constraints: BoxConstraints(minWidth: 36, minHeight: 36),
 )
 else if (_aiModels.isNotEmpty)
 Container(
 padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
 decoration: BoxDecoration(
 color: AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.circular(12),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: DropdownButtonHideUnderline(
 child: DropdownButton<String>(
 value: _selectedModelId,
 dropdownColor: AppTheme.surfaceOf(context),
 icon: Icon(Icons.arrow_drop_down, color: AppTheme.textPrimaryOf(context), size: 20),
 style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 13, fontWeight: FontWeight.w800),
 isDense: true,
 onChanged: (String? newValue) {
 if (newValue != null) {
 setState(() {
 _selectedModelId = newValue;
 });
 }
 },
 items: _aiModels.map<DropdownMenuItem<String>>((dynamic model) {
 return DropdownMenuItem<String>(
 value: model['id']?.toString(),
 child: Text(model['name'] ?? 'AI Model', style: TextStyle(fontSize: 13)),
 );
 }).toList(),
 ),
 ),
 ),
 ],
 ),
 ],
 ),
 ),
 Expanded(
 child: ListView.builder(
 controller: _scrollController,
 padding: EdgeInsets.all(16),
 itemCount: _messages.length,
 itemBuilder: (context, index) {
 final msg = _messages[index];
 final isUser = msg['role'] == 'user';
 return Align(
 alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
 child: Container(
 margin: EdgeInsets.only(bottom: 12),
 padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
 decoration: BoxDecoration(
 color: isUser ? AppTheme.primary : AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.only(
 topLeft: Radius.circular(20),
 topRight: Radius.circular(20),
 bottomLeft: Radius.circular(isUser ? 20 : 0),
 bottomRight: Radius.circular(isUser ? 0 : 20),
 ),
 boxShadow: [
 BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 8, offset: Offset(0, 4)),
 ],
 ),
 constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
 child: MarkdownBody(
 data: msg['content'] ?? '',
 styleSheet: MarkdownStyleSheet(
 p: TextStyle(color: isUser ? Colors.white : AppTheme.textPrimaryOf(context), fontSize: 15, height: 1.45),
 code: TextStyle(
 color: isUser ? Colors.white70 : AppTheme.accent,
 fontSize: 13,
 backgroundColor: isUser ? Colors.white.withAlphaOpacity(0.12) : AppTheme.elevatedOf(context),
 ),
 strong: TextStyle(
 color: isUser ? Colors.white : AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.w800,
 ),
 ),
 ),
 ),
 );
 },
 ),
 ),
 if (_isLoading)
 Padding(
 padding: EdgeInsets.all(8.0),
 child: CircularProgressIndicator(color: AppTheme.primary),
 ),
 Container(
 padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))],
 ),
 child: SafeArea(
 child: Row(
 children: [
 Expanded(
 child: Container(
 decoration: BoxDecoration(
 color: AppTheme.backgroundOf(context),
 borderRadius: BorderRadius.circular(24),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: TextField(
 controller: _messageController,
 style: TextStyle(color: AppTheme.textPrimaryOf(context)),
 decoration: InputDecoration(
 hintText: 'Ask Yagya Mitra...',
 hintStyle: TextStyle(color: AppTheme.mutedOf(context)),
 border: InputBorder.none,
 contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
 ),
 onSubmitted: (_) => _sendMessage(),
 ),
 ),
 ),
 SizedBox(width: 12),
 GestureDetector(
 onTap: _isLoading ? null : _sendMessage,
 child: AnimatedOpacity(
 opacity: _isLoading ? 0.5 : 1.0,
 duration: Duration(milliseconds: 200),
 child: Container(
 padding: EdgeInsets.all(14),
 decoration: BoxDecoration(
 gradient: LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight]),
 shape: BoxShape.circle,
 ),
 child: _isLoading
 ? SizedBox(
 width: 24,
 height: 24,
 child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
 )
 : Icon(Icons.send_rounded, color: Colors.white, size: 24),
 ),
 ),
 ),
 ],
 ),
 ),
 ),
 ],
 ),
 ),
 );
 }
}