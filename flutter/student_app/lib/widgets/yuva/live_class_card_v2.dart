import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class LiveClassCardV2 extends StatefulWidget {
  final Map<String, dynamic> session;
  final bool isLive;
  final VoidCallback? onJoin;

  const LiveClassCardV2({
    super.key,
    required this.session,
    required this.isLive,
    this.onJoin,
  });

  @override
  State<LiveClassCardV2> createState() => _LiveClassCardV2State();
}

class _LiveClassCardV2State extends State<LiveClassCardV2>
    with SingleTickerProviderStateMixin {
  AnimationController? _pulseController;
  Animation<double>? _pulseAnim;
  String _countdownText = '';
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    if (widget.isLive) {
      _pulseController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1200),
      )..repeat(reverse: true);
      _pulseAnim = Tween<double>(begin: 0.3, end: 1.0).animate(
        CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
      );
    } else {
      _updateCountdown();
      _countdownTimer = Timer.periodic(const Duration(seconds: 60), (_) {
        if (mounted) setState(() => _updateCountdown());
      });
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pulseController?.dispose();
    super.dispose();
  }

  void _updateCountdown() {
    final raw = (widget.session['start_time'] ??
            widget.session['starts_at'] ??
            widget.session['scheduled_at'] ??
            '')
        .toString();
    if (raw.isEmpty) return;
    try {
      var normalized = raw;
      if (!normalized.endsWith('Z') &&
          !normalized.contains('+') &&
          normalized.length >= 19) {
        normalized = '${normalized.substring(0, 19)}Z';
      }
      final startDt = DateTime.parse(normalized).toLocal();
      final now = DateTime.now();
      final diff = startDt.difference(now);
      if (diff.isNegative) {
        _countdownText = '';
      } else if (diff.inDays > 0) {
        _countdownText = 'Starts in ${diff.inDays}d ${diff.inHours % 24}h';
      } else if (diff.inHours > 0) {
        _countdownText = 'Starts in ${diff.inHours}h ${diff.inMinutes % 60}m';
      } else if (diff.inMinutes > 0) {
        _countdownText = 'Starts in ${diff.inMinutes}m';
      } else {
        _countdownText = 'Starting soon';
      }
    } catch (_) {
      _countdownText = '';
    }
  }

  static String _formatTime(String raw) {
    if (raw.isEmpty) return '';
    try {
      var normalized = raw;
      if (!normalized.endsWith('Z') &&
          !normalized.contains('+') &&
          normalized.length >= 19) {
        normalized = '${normalized.substring(0, 19)}Z';
      }
      final dt = DateTime.parse(normalized).toLocal();
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final minute = dt.minute.toString().padLeft(2, '0');
      final day = dt.day;
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      final month = months[dt.month - 1];
      return '$day $month, $hour:$minute $period';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final rawStartsAt = (widget.session['start_time'] ??
            widget.session['starts_at'] ??
            widget.session['scheduled_at'] ??
            '')
        .toString();
    final startsAt = _formatTime(rawStartsAt);
    final title = (widget.session['title'] ?? 'Live Class').toString();
    final courseTitle = (widget.session['course_title'] ?? 'Course').toString();
    final requiredCredits =
        num.tryParse(widget.session['required_self_study_credits']?.toString() ?? '0') ?? 0;

    return SizedBox(
      width: 280,
      height: 210,
      child: YuvaCard(
        onTap: widget.isLive ? widget.onJoin : null,
        gradient: widget.isLive
            ? const LinearGradient(
                colors: [Color(0xFF2A0A0A), Color(0xFF1A0505)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        backgroundColor: widget.isLive ? null : AppTheme.surfaceOf(context),
        side: widget.isLive
            ? const BorderSide(color: Color(0x88EF4444), width: 1.5)
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (widget.isLive)
                  _LivePulse(animation: _pulseAnim)
                else
                  Icon(Icons.schedule_rounded,
                      color: AppTheme.primaryLight, size: 18),
                const SizedBox(width: AppTheme.space2),
                Text(
                  widget.isLive ? 'LIVE NOW' : 'UPCOMING',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: widget.isLive ? AppTheme.danger : AppTheme.primaryLight,
                        fontSize: 11,
                        letterSpacing: 0.8,
                      ),
                ),
                const Spacer(),
                if (requiredCredits > 0)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.account_balance_wallet_rounded,
                          size: 14, color: AppTheme.gold),
                      const SizedBox(width: 4),
                      Text(
                        '₹${requiredCredits.toStringAsFixed(2)}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.gold,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: AppTheme.space3),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: widget.isLive ? AppTheme.surface : AppTheme.textPrimaryOf(context),
                    fontSize: 16,
                  ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppTheme.space1),
            Text(
              courseTitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: widget.isLive
                        ? AppTheme.surface.withAlphaOpacity(0.7)
                        : AppTheme.mutedOf(context),
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (startsAt.isNotEmpty && !widget.isLive) ...[
              const SizedBox(height: AppTheme.space1),
              Text(
                startsAt,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.textTertiaryOf(context),
                    ),
              ),
            ],
            if (_countdownText.isNotEmpty && !widget.isLive) ...[
              const SizedBox(height: AppTheme.space1),
              Text(
                _countdownText,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
            const Spacer(),
            YuvaButton(
              label: widget.isLive ? 'JOIN CLASS' : 'SCHEDULED',
              onPressed: widget.isLive ? widget.onJoin : null,
              variant: widget.isLive ? YuvaButtonVariant.secondary : YuvaButtonVariant.outline,
              height: 42,
            ),
          ],
        ),
      ),
    );
  }
}

class _LivePulse extends StatelessWidget {
  final Animation<double>? animation;

  const _LivePulse({required this.animation});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation!,
      builder: (context, child) => Opacity(
        opacity: animation!.value,
        child: child,
      ),
      child: Container(
        width: 10,
        height: 10,
        decoration: const BoxDecoration(
          color: AppTheme.danger,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}