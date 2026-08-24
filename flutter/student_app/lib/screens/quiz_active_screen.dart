import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/yuva/index.dart';

class QuizActiveScreen extends StatefulWidget {
  final Map<String, dynamic> quiz;

  const QuizActiveScreen({super.key, required this.quiz});

  @override
  State<QuizActiveScreen> createState() => _QuizActiveScreenState();
}

class _QuizActiveScreenState extends State<QuizActiveScreen> {
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  List<dynamic> _questions = [];
  final Map<String, int> _selectedAnswers = {};
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
        if (_isTimed && mounted) {
          _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
            if (!mounted) {
              timer.cancel();
              return;
            }
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
      const SnackBar(
        content: Text('Time up! Auto-submitting your answers...'),
        backgroundColor: Colors.orange,
      ),
    );
    _submitQuiz();
  }

  void _selectAnswer(String questionId, int selectedIndex) {
    setState(() => _selectedAnswers[questionId] = selectedIndex);
  }

  void _submitQuiz() async {
    if (_isSubmitting) return;
    _timer?.cancel();
    setState(() => _isSubmitting = true);

    try {
      final answersList = _selectedAnswers.entries
          .where((e) => e.value >= 0)
          .map((e) => {'question_id': e.key, 'selected_index': e.value})
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
        final navigator = Navigator.of(context);
        Future.delayed(const Duration(seconds: 2), () {
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
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimaryOf(context)),
        ),
        backgroundColor: AppTheme.backgroundOf(context),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          if (_isTimed && !_isLoading && _error == null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.space3),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _remainingSeconds <= 60
                        ? AppTheme.danger.withAlphaOpacity(0.15)
                        : AppTheme.success.withAlphaOpacity(0.15),
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    border: Border.all(
                      color: _remainingSeconds <= 60
                          ? AppTheme.danger.withAlphaOpacity(0.4)
                          : AppTheme.success.withAlphaOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _remainingSeconds <= 60 ? Icons.timer_off_rounded : Icons.timer_outlined,
                        color: _remainingSeconds <= 60 ? AppTheme.danger : AppTheme.success,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _formatTime(_remainingSeconds),
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: _remainingSeconds <= 60 ? AppTheme.danger : AppTheme.success,
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
              padding: const EdgeInsets.only(right: AppTheme.space4),
              child: Center(
                child: Text(
                  '$answeredCount/$totalQuestions',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.textSecondaryOf(context),
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
                  const CircularProgressIndicator(color: AppTheme.primary),
                  const SizedBox(height: 16),
                  Text('Loading quiz questions...', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.mutedOf(context))),
                ],
              ),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.space6),
                    child: YuvaEmptyState.error(
                      title: _error!,
                      actionLabel: 'Retry',
                      onAction: _fetchExamDetails,
                    ),
                  ),
                )
              : _questions.isEmpty
                  ? Center(
                      child: YuvaEmptyState.noData(title: 'This exam has no questions.'),
                    )
                  : Column(
                      children: [
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(AppTheme.space4),
                            itemCount: _questions.length,
                            itemBuilder: (context, index) {
                              final question = _questions[index];
                              final qId = question['id'].toString();
                              return _QuestionCard(
                                index: index,
                                question: question,
                                selectedIndex: _selectedAnswers[qId] ?? -1,
                                onSelect: (idx) => _selectAnswer(qId, idx),
                              );
                            },
                          ),
                        ),
                        SafeArea(
                          top: false,
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(AppTheme.space4, 12, AppTheme.space4, 12),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceOf(context),
                              border: Border(top: BorderSide(color: AppTheme.borderOf(context))),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '$answeredCount of ${_questions.length} answered',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: AppTheme.mutedOf(context),
                                        ),
                                  ),
                                ),
                                YuvaButton.primary(
                                  label: 'Submit Quiz',
                                  onPressed:
                                      (_isSubmitting || answeredCount == 0) ? null : _submitQuiz,
                                  isLoading: _isSubmitting,
                                  height: 48,
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

class _QuestionCard extends StatelessWidget {
  final int index;
  final dynamic question;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  const _QuestionCard({
    required this.index,
    required this.question,
    required this.selectedIndex,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final qText = question['question_text'] ?? 'Question ${index + 1}';
    final marks = int.tryParse(question['marks']?.toString() ?? '1') ?? 1;
    final optionsRaw = question['options_json'];
    List<String> options = [];
    if (optionsRaw is String) {
      try {
        final parsed = jsonDecode(optionsRaw);
        if (parsed is List) options = parsed.map((e) => e.toString()).toList();
      } catch (_) {}
    } else if (optionsRaw is List) {
      options = optionsRaw.map((e) => e.toString()).toList();
    }

    return YuvaCard(
      margin: const EdgeInsets.only(bottom: AppTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selectedIndex >= 0 ? AppTheme.primary : AppTheme.elevatedOf(context),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '${index + 1}',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: selectedIndex >= 0 ? AppTheme.surface : AppTheme.textSecondaryOf(context),
                      ),
                ),
              ),
              const SizedBox(width: AppTheme.space3),
              Expanded(
                child: Text(
                  qText,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 15,
                        height: 1.4,
                      ),
                  maxLines: 8,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withAlphaOpacity(0.12),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                child: Text(
                  '$marks mark${marks == 1 ? '' : 's'}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.space4),
          if (options.isEmpty)
            Text(
              'No options available',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.mutedOf(context),
                    fontStyle: FontStyle.italic,
                  ),
            )
          else
            ...options.asMap().entries.map((entry) {
              final optIdx = entry.key;
              final optText = entry.value;
              final isSelected = selectedIndex == optIdx;
              return Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.space2),
                child: InkWell(
                  onTap: () => onSelect(optIdx),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.space3, vertical: AppTheme.space3),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withAlphaOpacity(0.1) : AppTheme.elevatedOf(context),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.borderOf(context),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_outlined,
                          color: isSelected ? AppTheme.primary : AppTheme.mutedOf(context),
                          size: 22,
                        ),
                        const SizedBox(width: AppTheme.space3),
                        Expanded(
                          child: Text(
                            optText,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: isSelected ? AppTheme.textPrimaryOf(context) : AppTheme.textSecondaryOf(context),
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                                  height: 1.4,
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
            }),
        ],
      ),
    );
  }
}