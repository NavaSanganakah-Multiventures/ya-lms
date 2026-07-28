import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class QuizActiveScreen extends StatefulWidget {
 final Map<String, dynamic> quiz;

 QuizActiveScreen({super.key, required this.quiz});

 @override
 State<QuizActiveScreen> createState() => _QuizActiveScreenState();
}

class _QuizActiveScreenState extends State<QuizActiveScreen> {
 bool _isLoading = true;
 bool _isSubmitting = false;
 String? _error;
 List<dynamic> _questions = [];
 final Map<String, int> _selectedAnswers = {}; // question_id → selected_index
 int? _durationMinutes;
 Timer? _timer;
 int _elapsedSeconds = 0;
 String? _submissionResult;

 @override
 void initState() {
 super.initState();
 _fetchExamDetails();
 }

 @override
 void dispose() {
 _timer?.cancel();
 super.dispose();
 }

 bool get _isTimed => (_durationMinutes ?? 0) > 0;

 int get _remainingSeconds {
 if (!_isTimed) return -1;
 final remaining = (_durationMinutes! * 60) - _elapsedSeconds;
 return remaining > 0 ? remaining : 0;
 }

 String _formatTime(int totalSeconds) {
 if (totalSeconds < 0) return '';
 final minutes = totalSeconds ~/ 60;
 final seconds = totalSeconds % 60;
 return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
 }

 Future<void> _fetchExamDetails() async {
 if (!mounted) return;
 setState(() {
 _isLoading = true;
 _error = null;
 });
 try {
 final examId = (widget.quiz['id'] ?? '').toString();
 if (examId.isEmpty) {
 setState(() {
 _error = 'Exam ID missing';
 _isLoading = false;
 });
 return;
 }
 final response = await ApiService.getExamDetails(examId);
 if (!mounted) return;
 if (response.statusCode == 200) {
 final data = response.data;
 setState(() {
 _questions = (data['questions'] as List<dynamic>?) ?? [];
 _durationMinutes = data['exam']?['duration_minutes'] is int
 ? data['exam']['duration_minutes'] as int
 : int.tryParse(data['exam']?['duration_minutes']?.toString() ?? '0');
 _isLoading = false;
 });
 // Start timer if exam is timed
 if (_isTimed && mounted) {
 _timer = Timer.periodic( Duration(seconds: 1), (timer) {
 if (!mounted) { timer.cancel(); return; }
 setState(() => _elapsedSeconds++);
 if (_remainingSeconds <= 0) {
 timer.cancel();
 _autoSubmit();
 }
 });
 }
 } else {
 setState(() {
 _error = 'Exam details load nahi ho paye (${response.statusCode})';
 _isLoading = false;
 });
 }
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _error = 'Error: $e';
 _isLoading = false;
 });
 }
 }

 void _autoSubmit() {
 if (_isSubmitting) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Time up! Auto-submitting your answers...'),
 backgroundColor: Colors.orange,
 ),
 );
 _submitQuiz();
 }

 void _selectAnswer(String questionId, int selectedIndex) {
 setState(() {
 _selectedAnswers[questionId] = selectedIndex;
 });
 }

 void _submitQuiz() async {
 if (_isSubmitting) return;
 setState(() => _isSubmitting = true);

 try {
 // Build answers array in the format backend expects:
 // [{"question_id": "...", "selected_index": 0}]
 final answersList = _selectedAnswers.entries
 .where((e) => e.value >= 0)
 .map((e) => {
 'question_id': e.key,
 'selected_index': e.value,
 })
 .toList();

 final response = await ApiService.submitExam(
 widget.quiz['id'].toString(),
 {'answers': answersList},
 );
 if (!mounted) return;

 if (response.statusCode == 200) {
 final result = response.data;
 setState(() {
 _submissionResult = result['message'] ??
 'Quiz submitted! Score: ${result['score_percent'] ?? 'N/A'}%';
 });
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text(_submissionResult!),
 backgroundColor: AppTheme.success,
 ),
 );
 // Go back after short delay — use a key to prevent popping wrong route
 final navigator = Navigator.of(context);
 Future.delayed( Duration(seconds: 2), () {
 if (mounted && navigator.canPop()) navigator.pop();
 });
 } else {
 final errData = response.data;
 throw Exception(errData['error'] ?? 'Submit failed (${response.statusCode})');
 }
 } catch (e) {
 if (!mounted) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Submit error: $e'),
 backgroundColor: AppTheme.danger,
 ),
 );
 } finally {
 if (mounted) setState(() => _isSubmitting = false);
 }
 }

 @override
 Widget build(BuildContext context) {
 final title = widget.quiz['title'] ?? 'Quiz';
 final answeredCount = _selectedAnswers.length;
 final totalQuestions = _questions.length;

 return Scaffold(
 backgroundColor: AppTheme.backgroundOf(context),
 appBar: AppBar(
 title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
 backgroundColor: AppTheme.surfaceOf(context),
 elevation: 1,
 actions: [
 if (_isTimed && !_isLoading && _error == null)
 Padding(
 padding: EdgeInsets.symmetric(horizontal: 12),
 child: Center(
 child: Container(
 padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
 decoration: BoxDecoration(
 color: _remainingSeconds <= 60
 ? AppTheme.danger.withAlphaOpacity( 0.15)
 : AppTheme.success.withAlphaOpacity( 0.15),
 borderRadius: BorderRadius.circular(12),
 border: Border.all(
 color: _remainingSeconds <= 60
 ? AppTheme.danger.withAlphaOpacity( 0.4)
 : AppTheme.success.withAlphaOpacity( 0.3),
 ),
 ),
 child: Row(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(
 _remainingSeconds <= 60
 ? Icons.timer_off_rounded
 : Icons.timer_outlined,
 color: _remainingSeconds <= 60
 ? AppTheme.danger
 : AppTheme.success,
 size: 16,
 ),
 SizedBox(width: 6),
 Text(
 _formatTime(_remainingSeconds),
 style: TextStyle(
 color: _remainingSeconds <= 60
 ? AppTheme.danger
 : AppTheme.success,
 fontWeight: FontWeight.bold,
 fontSize: 14,
 ),
 ),
 ],
 ),
 ),
 ),
 ),
 if (totalQuestions > 0 && _error == null)
 Padding(
 padding: EdgeInsets.only(right: 8),
 child: Center(
 child: Text(
 '$answeredCount/$totalQuestions',
 style: TextStyle(
 color: AppTheme.textSecondaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 14,
 ),
 ),
 ),
 ),
 ],
 ),
 body: _isLoading
 ? Center(
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 CircularProgressIndicator(color: AppTheme.primary),
 SizedBox(height: 16),
 Text('Loading quiz questions...',
 style: TextStyle(color: AppTheme.mutedOf(context))),
 ],
 ),
 )
 : _error != null
 ? Center(
 child: Padding(
 padding: EdgeInsets.all(24),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.error_outline,
 color: AppTheme.danger, size: 48),
 SizedBox(height: 16),
 Text(_error!,
 textAlign: TextAlign.center,
 style: TextStyle(color: AppTheme.danger)),
 SizedBox(height: 16),
 ElevatedButton(
 onPressed: _fetchExamDetails,
 child: Text('Retry'),
 ),
 ],
 ),
 ),
 )
 : _questions.isEmpty
 ? Center(
 child: Text('This exam has no questions.',
 style: TextStyle(color: AppTheme.mutedOf(context))),
 )
 : Column(
 children: [
 Expanded(
 child: ListView.builder(
 padding: EdgeInsets.all(16),
 itemCount: _questions.length,
 itemBuilder: (context, index) {
 final question = _questions[index];
 final qId = question['id'].toString();
 final qText =
 question['question_text'] ?? 'Question $index';
 final marks = int.tryParse(
 question['marks']?.toString() ?? '1') ??
 1;
 final optionsRaw = question['options_json'];
 List<String> options = [];
 if (optionsRaw is String) {
 try {
 final parsed = jsonDecode(optionsRaw);
 if (parsed is List) {
 options = parsed.map((e) => e.toString()).toList();
 }
 } catch (_) {}
 } else if (optionsRaw is List) {
 options =
 optionsRaw.map((e) => e.toString()).toList();
 }
 final selectedIdx =
 _selectedAnswers[qId] ?? -1;

 return Container(
 margin: EdgeInsets.only(bottom: 16),
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 // Question header
 Row(
 crossAxisAlignment:
 CrossAxisAlignment.start,
 children: [
 Container(
 width: 28,
 height: 28,
 alignment: Alignment.center,
 decoration: BoxDecoration(
 color: selectedIdx >= 0
 ? AppTheme.primary
 : AppTheme.elevatedOf(context),
 shape: BoxShape.circle,
 ),
 child: Text(
 '${index + 1}',
 style: TextStyle(
 color: selectedIdx >= 0
 ? Colors.white
 : AppTheme.textSecondaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 13,
 ),
 ),
 ),
 SizedBox(width: 12),
 Expanded(
 child: Text(
 qText,
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 15,
 fontWeight: FontWeight.w600,
 height: 1.4,
 ),
 maxLines: 8,
 overflow: TextOverflow.ellipsis,
 ),
 ),
 // Marks badge
 Container(
 padding: EdgeInsets.symmetric(
 horizontal: 8, vertical: 3),
 decoration: BoxDecoration(
 color:
 AppTheme.primaryLight.withAlphaOpacity( 0.12),
 borderRadius:
 BorderRadius.circular(8),
 ),
 child: Text(
 '$marks mark${marks == 1 ? '' : 's'}',
 style: TextStyle(
 color: AppTheme.primaryLight,
 fontSize: 11,
 fontWeight: FontWeight.w700,
 ),
 ),
 ),
 ],
 ),
 SizedBox(height: 14),
 // Options
 if (options.isEmpty)
 Text('No options available',
 style: TextStyle(
 color: AppTheme.mutedOf(context),
 fontStyle: FontStyle.italic))
 else
 ...options.asMap().entries.map(
 (entry) {
 final optIdx = entry.key;
 final optText = entry.value;
 final isSelected =
 selectedIdx == optIdx;
 return Padding(
 padding:
 EdgeInsets.only(bottom: 8),
 child: InkWell(
 onTap: () => _selectAnswer(
 qId, optIdx),
 borderRadius:
 BorderRadius.circular(12),
 child: Container(
 padding:
 EdgeInsets.symmetric(
 horizontal: 14,
 vertical: 12),
 decoration: BoxDecoration(
 color: isSelected
 ? AppTheme.primary
 .withAlphaOpacity( 0.1)
 : AppTheme.elevatedOf(context),
 borderRadius:
 BorderRadius.circular(12),
 border: Border.all(
 color: isSelected
 ? AppTheme.primary
 : AppTheme.borderOf(context),
 width:
 isSelected ? 2 : 1,
 ),
 ),
 child: Row(
 children: [
 Icon(
 isSelected
 ? Icons
 .radio_button_checked
 : Icons
 .radio_button_off_outlined,
 color: isSelected
 ? AppTheme.primary
 : AppTheme.mutedOf(context),
 size: 22,
 ),
 SizedBox(width: 12),
 Expanded(
 child: Text(
 optText,
 style: TextStyle(
 color: isSelected
 ? AppTheme
 .textPrimary
 : AppTheme
 .textSecondary,
 fontWeight:
 isSelected
 ? FontWeight
 .w600
 : FontWeight
 .normal,
 fontSize: 14,
 ),
 maxLines: 4,
 overflow: TextOverflow.ellipsis,
 ),
 ),
 ],
 ),
 ),
 ),
 );
 },
 ),
 ],
 ),
 );
 },
 ),
 ),
 // Bottom submit bar
 SafeArea(
 top: false,
 child: Container(
 padding: EdgeInsets.fromLTRB(16, 12, 16, 12),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 border: Border(
 top: BorderSide(color: AppTheme.borderOf(context))),
 ),
 child: Row(
 children: [
 Expanded(
 child: Text(
 '$answeredCount of ${_questions.length} answered',
 style: TextStyle(
 color: AppTheme.mutedOf(context),
 fontSize: 13,
 ),
 ),
 ),
 SizedBox(
 height: 48,
 child: ElevatedButton(
 onPressed:
 (_isSubmitting || answeredCount == 0)
 ? null
 : _submitQuiz,
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 disabledBackgroundColor: AppTheme.borderOf(context),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(12),
 ),
 padding: EdgeInsets.symmetric(
 horizontal: 28),
 ),
 child: _isSubmitting
 ? SizedBox(
 width: 20,
 height: 20,
 child: CircularProgressIndicator(
 strokeWidth: 2,
 color: Colors.white,
 ),
 )
 : Text(
 'Submit Quiz',
 style: TextStyle(
 fontSize: 15,
 fontWeight: FontWeight.bold,
 color: Colors.white,
 ),
 ),
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
