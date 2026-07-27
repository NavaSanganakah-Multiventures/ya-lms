import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'course_detail_screen.dart';
import 'checkout_screen.dart';
import 'subscription_screen.dart';
import '../utils/api_utils.dart';
import '../utils/class_helper.dart';
import '../utils/responsive.dart';
import '../utils/adaptive.dart';
import 'quiz_list_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const String _cacheKey = 'dashboard_cache';
  static const String _cacheTimeKey = 'dashboard_cache_time';
  static const int _cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  List<dynamic> _enrolledCourses = [];
  List<dynamic> _availableCourses = [];
  List<dynamic> _todayLive = [];
  List<dynamic> _tomorrowLive = [];
  Map<String, dynamic>? _mySub;
  bool _isLoading = true;
  bool _isShowingCached = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
  }

  Future<void> _fetchDashboard({bool skipCache = false}) async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _isShowingCached = false;
      _error = null;
    });

    // 1. Turant cached data dikha do (skip if pull-to-refresh)
    bool hasCached = false;
    if (!skipCache) {
      final cached = await _getCachedDashboard();
      if (cached != null && mounted) {
        _applyDashboardData(cached);
        hasCached = true;
        setState(() {
          _isLoading = false;
          _isShowingCached = true;
        });
      }
    }

    // 2. Fresh data lao
    try {
      final dashboardFuture = ApiService.getDashboardData();
      final subFuture = ApiService.getUserSubscription();

      // Handle each API call independently so a failure in one doesn't lose the other's data
      dynamic response;
      dynamic subResponse;
      try {
        response = await dashboardFuture;
      } catch (e) {
        debugPrint('Dashboard data fetch failed: $e');
      }
      try {
        subResponse = await subFuture;
      } catch (e) {
        debugPrint('Subscription fetch failed: $e');
      }

      if (!mounted) return;
      if (response != null && response.statusCode == 200) {
        final data = response!.data;
        if (subResponse != null && subResponse.statusCode == 200) {
          final subData = subResponse!.data;
          _mySub = subData['subscription'];
        }
        _applyDashboardData(data);
        await _cacheDashboard(data);
        setState(() {
          _isLoading = false;
          _isShowingCached = false;
        });
        return;
      } else if (response?.statusCode == 401 || response?.statusCode == 403) {
        setState(() {
          _error = 'Session expired. कृपया दोबारा login करें।';
          _isLoading = false;
          _isShowingCached = false;
        });
        return;
      }

      // Dashboard API failed — fallback to courses-only
      if (!hasCached) {
        await _fetchCoursesFallback();
      } else {
        setState(() {
          _isLoading = false;
          _isShowingCached = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      if (!hasCached) {
        await _fetchCoursesFallback();
      } else {
        setState(() {
          _isLoading = false;
          _isShowingCached = false;
        });
      }
    }
  }

  void _applyDashboardData(Map<String, dynamic> data) {
    _enrolledCourses = ApiUtils.extractList(data, 'enrolledCourses');
    _availableCourses = List<dynamic>.from(data['availableCourses'] ?? []);
    _todayLive = ApiUtils.extractList(data, 'todayLive');
    _tomorrowLive = ApiUtils.extractList(data, 'tomorrowLive');
  }

  Future<Map<String, dynamic>?> _getCachedDashboard() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt(_cacheTimeKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > _cacheTtlMs) return null;
      final json = prefs.getString(_cacheKey);
      if (json == null || json.isEmpty) return null;
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> _cacheDashboard(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(data));
      await prefs.setInt(_cacheTimeKey, DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('_cacheDashboard failed: $e');
    }
  }

  Future<void> _fetchCoursesFallback() async {
    try {
      final response = await ApiService.getCourses();
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = response.data;
        setState(() {
          _availableCourses = ApiUtils.extractList(data, 'courses');
          _isLoading = false;
          _isShowingCached = false;
        });
      } else {
        setState(() {
          _error = 'Dashboard load नहीं हो पाया (${response.statusCode})';
          _isLoading = false;
          _isShowingCached = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Network Error: Internet connection check करें';
        _isLoading = false;
        _isShowingCached = false;
      });
    }
  }

  void _openCourse(Map<String, dynamic> course, bool isEnrolled) {
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CourseDetailScreen(course: course, isEnrolled: isEnrolled),
      ),
    ).then((_) {
      if (mounted) _fetchDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    final enrolledList = _enrolledCourses.whereType<Map<String, dynamic>>().toList();

    // Filter available courses to only show those not in enrolled
    final enrolledIds = enrolledList
        .map((e) => (e['id'] ?? e['slug'] ?? '').toString())
        .toSet();
    final exploreList = _availableCourses
        .whereType<Map<String, dynamic>>()
        .where(
          (c) => !enrolledIds.contains((c['id'] ?? c['slug'] ?? '').toString()),
        )
        .toList();

    return DecoratedBox(
        decoration: const BoxDecoration(
          color: AppTheme.background,
        ),
        child: SafeArea(
          child: ResponsiveLayout(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.elevated,
              onRefresh: () => _fetchDashboard(skipCache: true),
              child: _isLoading
                  ? const _DashboardLoading()
                  : _error != null
                  ? _ErrorState(message: _error!, onRetry: _fetchDashboard)
                  : CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        if (_isShowingCached)
                          SliverToBoxAdapter(
                            child: Container(
                              color: AppTheme.primary.withValues(alpha: 0.15),
                              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                              child: Row(
                                children: [
                                  const SizedBox(
                                    width: 14, height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                  const SizedBox(width: 10),
                                  const Text('Cached data — Refreshing…',
                                    style: TextStyle(fontSize: 12, color: AppTheme.primary)),
                                ],
                              ),
                            ),
                          ),
                        SliverToBoxAdapter(
                          child: _HeroSection(
                            user: user,
                            courseCount: enrolledList.length + exploreList.length,
                            liveCount: _todayLive.length + _tomorrowLive.length,
                            liveNowCount: _todayLive.where((s) => (s is Map && s['status']?.toString() == 'live')).length,
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: _LiveClassSection(
                            todayLive: _todayLive,
                            tomorrowLive: _tomorrowLive,
                            onJoin: (session) => ClassHelper.joinLiveClass(context, session),
                          ),
                        ),
                        if (_mySub != null)
                          SliverToBoxAdapter(
                            child: _SubscriptionStatus(
                              sub: _mySub!,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const SubscriptionScreen(),
                                  ),
                                ).then((_) => _fetchDashboard());
                              },
                            ),
                          ),
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const QuizListScreen()),
                                );
                              },
                              icon: const Icon(Icons.quiz_rounded, color: Colors.white),
                              label: const Text('My Quizzes & Exams', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primary,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (enrolledList.isNotEmpty) ...[
                          SliverToBoxAdapter(
                            child: _SectionHeader(
                              title: 'My Enrolled Courses',
                              subtitle: '${enrolledList.length} course${enrolledList.length == 1 ? '' : 's'}',
                            ),
                          ),
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                            sliver: SliverList.separated(
                              itemCount: enrolledList.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final course = enrolledList[index];
                                return _CourseCard(
                                  course: course,
                                  isEnrolled: true,
                                  index: index,
                                  onTap: () => _openCourse(course, true),
                                );
                              },
                            ),
                          ),
                        ],
                        SliverToBoxAdapter(
                          child: _SectionHeader(
                            title: 'Explore Courses',
                            subtitle: '${exploreList.length} course${exploreList.length == 1 ? '' : 's'}',
                          ),
                        ),
                        if (exploreList.isEmpty)
                          const SliverToBoxAdapter(
                            child: Padding(
                              padding: EdgeInsets.all(32.0),
                              child: _EmptyCourses(),
                            ),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                            sliver: SliverList.separated(
                              itemCount: exploreList.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final course = exploreList[index];
                                return _CourseCard(
                                  course: course,
                                  isEnrolled: false,
                                  index: index,
                                  onTap: () => _openCourse(course, false),
                                  onBuyNow: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => CheckoutScreen(
                                          item: course,
                                          itemType: 'course',
                                          amountInr: ((course['price_rupees'] ?? course['price']) is int)
                                              ? (course['price_rupees'] ?? course['price']) as int
                                              : num.tryParse((course['price_rupees'] ?? course['price'])?.toString() ?? '')?.toInt() ?? 0,
                                        ),
                                      ),
                                    ).then((success) {
                                        if (success == true) {
                                          _fetchDashboard();
                                        }
                                      });
                                  },
                                );
                              },
                            ),
                          ),
                      ],
                    ),
            ),
          ),
        ),
    );
  }
}

class _DashboardLoading extends StatelessWidget {
  const _DashboardLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppTheme.primaryLight),
          SizedBox(height: 14),
          Text(
            'Learning dashboard तैयार हो रहा है...',
            style: TextStyle(color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  final Map<String, dynamic>? user;
  final int courseCount;
  final int liveCount;
  final int liveNowCount;

  const _HeroSection({
    required this.user,
    required this.courseCount,
    required this.liveCount,
    required this.liveNowCount,
  });

  @override
  Widget build(BuildContext context) {
    final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
    final upcomingCount = liveCount - liveNowCount;
    return Container(
      margin: EdgeInsets.fromLTRB(screenHorizontalPadding(context), 10, screenHorizontalPadding(context), 20),
      padding: adaptivePadding(context, horizontal: 24, vertical: 24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppTheme.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          const Positioned(
            right: -10,
            top: -10,
            child: Icon(
              Icons.spa_rounded,
              color: AppTheme.moccasinLight,
              size: 110,
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppTheme.primary.withAlpha(50)),
                    ),
                    child: const Text(
                      'STUDENT DASHBOARD',
                      style: TextStyle(
                        color: AppTheme.primary,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Namaste, $name',
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              const Text(
                'Aapke saare courses aur live classes ek hi jagah.',
                style: TextStyle(color: AppTheme.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  _HeroStat(value: '$courseCount', label: 'Courses'),
                  const SizedBox(width: 12),
                  _HeroStat(
                    value: '$liveNowCount', label: 'Live Now',
                    valueColor: AppTheme.danger,
                    labelColor: AppTheme.danger,
                  ),
                  const SizedBox(width: 12),
                  _HeroStat(value: '$upcomingCount', label: 'Upcoming'),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String value;
  final String label;
  final Color? valueColor;
  final Color? labelColor;

  const _HeroStat({
    required this.value,
    required this.label,
    this.valueColor,
    this.labelColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.elevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: TextStyle(
                color: valueColor ?? AppTheme.primary,
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: labelColor ?? AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LiveClassSection extends StatelessWidget {
  final List<dynamic> todayLive;
  final List<dynamic> tomorrowLive;
  final void Function(Map<String, dynamic> session) onJoin;

  const _LiveClassSection({
    required this.todayLive,
    required this.tomorrowLive,
    required this.onJoin,
  });

  @override
  Widget build(BuildContext context) {
    final seen = <String>{};
    final allSessions = [...todayLive, ...tomorrowLive].where((s) {
      if (s is! Map) return false;
      final id = (s['id'] ?? s['sessionId'] ?? '').toString();
      return id.isEmpty ? true : seen.add(id);
    }).toList();

    final liveNow = allSessions.where((s) => s is Map && s['status']?.toString() == 'live').toList();
    final scheduled = allSessions.where((s) => s is Map && s['status']?.toString() != 'live').toList();

    if (allSessions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader(title: 'Live Classes', subtitle: 'Today & tomorrow', compact: true),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Column(
                children: [
                  Icon(Icons.nights_stay_outlined, color: AppTheme.secondaryLight, size: 38),
                  SizedBox(height: 10),
                  Text('Aaj ya kal koi live class scheduled नहीं है', style: TextStyle(color: AppTheme.muted)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- LIVE NOW row ---
          if (liveNow.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 12, top: 4),
              child: Row(
                children: [
                  Container(
                    width: 10, height: 10,
                    decoration: const BoxDecoration(
                      color: AppTheme.danger,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'LIVE NOW  •  ${liveNow.length} active',
                    style: const TextStyle(
                      color: AppTheme.danger,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 220,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: liveNow.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final session = liveNow[index] is Map
                      ? Map<String, dynamic>.from(liveNow[index])
                      : <String, dynamic>{};
                  return SizedBox(
                    width: 300,
                    child: _LiveClassCard(
                      session: session,
                      isTomorrow: false,
                      isLive: true,
                      onJoin: () => onJoin(session),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          // --- UPCOMING row ---
          if (scheduled.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  const Icon(Icons.schedule_rounded, color: AppTheme.primaryLight, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'UPCOMING  •  ${scheduled.length} class${scheduled.length == 1 ? '' : 'es'}',
                    style: const TextStyle(
                      color: AppTheme.primaryLight,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: isMobile(context) ? 180 : (isTablet(context) ? 210 : 240),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: scheduled.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final session = scheduled[index] is Map
                      ? Map<String, dynamic>.from(scheduled[index])
                      : <String, dynamic>{};
                  return _LiveClassCard(
                    session: session,
                    isTomorrow: false,
                    isLive: false,
                    onJoin: () => onJoin(session),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LiveClassCard extends StatefulWidget {
  final Map<String, dynamic> session;
  final bool isTomorrow;
  final bool isLive;
  final VoidCallback onJoin;

  const _LiveClassCard({
    required this.session,
    required this.isTomorrow,
    required this.isLive,
    required this.onJoin,
  });

  @override
  State<_LiveClassCard> createState() => _LiveClassCardState();
}

class _LiveClassCardState extends State<_LiveClassCard> with SingleTickerProviderStateMixin {
  AnimationController? _pulseController;
  Animation<double>? _pulseAnim;
  String _countdownText = '';

  @override
  void initState() {
    super.initState();
    if (widget.isLive) {
      _pulseController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1200),
      )..repeat(reverse: true);
      _pulseAnim = Tween<double>(begin: 0.3, end: 1.0).animate(_pulseController!);
    } else {
      _updateCountdown();
    }
  }

  void _updateCountdown() {
    final raw = (widget.session['start_time'] ??
        widget.session['starts_at'] ??
        widget.session['scheduled_at'] ??
        '').toString();
    if (raw.isEmpty) return;
    try {
      String normalized = raw;
      if (!normalized.endsWith('Z') && !normalized.contains('+') && normalized.length >= 19) {
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

  @override
  void dispose() {
    _pulseController?.dispose();
    super.dispose();
  }

  static String _formatTime(String raw) {
    if (raw.isEmpty) return '';
    try {
      String normalized = raw;
      if (!normalized.endsWith('Z') && !normalized.contains('+') && normalized.length >= 19) {
        normalized = '${normalized.substring(0, 19)}Z';
      }
      final dt = DateTime.parse(normalized).toLocal();
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final minute = dt.minute.toString().padLeft(2, '0');
      final day = dt.day;
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      final month = months[dt.month - 1];
      return '$day $month, $hour:$minute $period';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = (widget.session['status'] ?? 'scheduled').toString();
    final canJoin = widget.isLive;
    final rawStartsAt =
        (widget.session['start_time'] ??
                widget.session['starts_at'] ??
                widget.session['scheduled_at'] ??
                '')
            .toString();
    final startsAt = _formatTime(rawStartsAt);
    final requiredCredits = num.tryParse(widget.session['required_self_study_credits']?.toString() ?? '0') ?? 0;

    Widget statusIndicator;
    if (widget.isLive) {
      statusIndicator = AnimatedBuilder(
        animation: _pulseAnim!,
        builder: (context, child) {
          return Opacity(
            opacity: _pulseAnim!.value,
            child: child,
          );
        },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10, height: 10,
              decoration: const BoxDecoration(
                color: AppTheme.danger,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            const Text(
              'LIVE NOW',
              style: TextStyle(
                color: AppTheme.danger,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
      );
    } else {
      statusIndicator = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.calendar_month,
            color: AppTheme.primaryLight,
            size: 16,
          ),
          const SizedBox(width: 6),
          Text(
            widget.isTomorrow ? 'TOMORROW' : 'TODAY',
            style: const TextStyle(
              color: AppTheme.primaryLight,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
        ],
      );
    }

    List<Widget> infoRows = [
      Row(
        children: [
          statusIndicator,
          const Spacer(),
          const Icon(Icons.wifi_tethering_rounded, color: AppTheme.textSecondary, size: 18),
        ],
      ),
      const SizedBox(height: 14),
      Text(
        (widget.session['title'] ?? 'Live Class').toString(),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AppTheme.textPrimary,
          fontSize: 17,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 6),
      Text(
        (widget.session['course_title'] ?? 'Course').toString(),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: AppTheme.muted, fontSize: 12),
      ),
    ];

    if (startsAt.isNotEmpty && !widget.isLive) {
      infoRows.addAll([
        const SizedBox(height: 6),
        Text(
          startsAt,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: AppTheme.mutedSoft, fontSize: 11),
        ),
      ]);
    }

    if (_countdownText.isNotEmpty && !widget.isLive) {
      infoRows.addAll([
        const SizedBox(height: 4),
        Row(
          children: [
            const Icon(Icons.timer_outlined, size: 13, color: AppTheme.primaryLight),
            const SizedBox(width: 4),
            Text(
              _countdownText,
              style: const TextStyle(color: AppTheme.primaryLight, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ]);
    }

    if (requiredCredits > 0) {
      infoRows.addAll([
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.account_balance_wallet_rounded, size: 14, color: AppTheme.primaryLight),
            const SizedBox(width: 4),
            Text(
              '₹${requiredCredits.toStringAsFixed(2)} / class',
              style: const TextStyle(color: AppTheme.primaryLight, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ]);
    }

    infoRows.add(const Spacer());

    infoRows.add(
      ElevatedButton.icon(
        onPressed: canJoin ? widget.onJoin : null,
        icon: const Icon(Icons.play_arrow_rounded),
        label: Text(
          canJoin ? 'JOIN CLASS' : 'SCHEDULED',
          style: TextStyle(fontWeight: widget.isLive ? FontWeight.w900 : FontWeight.w700),
        ),
        style: ElevatedButton.styleFrom(
          minimumSize: Size(double.infinity, widget.isLive ? 48 : 40),
          backgroundColor: widget.isLive ? AppTheme.danger : null,
        ),
      ),
    );

    return Container(
      width: widget.isLive ? 300 : (isMobile(context) ? 260 : (isTablet(context) ? 300 : 340)),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: widget.isLive
            ? const LinearGradient(
                colors: [Color(0xFF2A0A0A), Color(0xFF1A0505)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : const LinearGradient(
                colors: [AppTheme.elevated, AppTheme.surface],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: widget.isLive ? const Color(0x88EF4444) : AppTheme.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: infoRows,
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  final Map<String, dynamic> course;
  final bool isEnrolled;
  final int index;
  final VoidCallback onTap;
  final VoidCallback? onBuyNow;

  const _CourseCard({
    required this.course,
    required this.isEnrolled,
    required this.index,
    required this.onTap,
    this.onBuyNow,
  });

  @override
  Widget build(BuildContext context) {
    final accent = [
      AppTheme.primaryLight,
      AppTheme.secondaryLight,
      AppTheme.accent,
    ][index % 3];
    return InkWell(
      borderRadius: BorderRadius.circular(28),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: adaptiveIconSize(context, 56),
              height: adaptiveIconSize(context, 56),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [accent.withAlpha(76), AppTheme.elevated],
                ),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: accent.withAlpha(92)),
              ),
              child: Icon(Icons.menu_book_rounded, color: accent),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isEnrolled)
                        Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x2222C55E),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Text(
                            'ENROLLED',
                            style: TextStyle(
                              color: AppTheme.success,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      Expanded(
                        child: Text(
                          (course['title'] ?? 'Course Title').toString(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    (course['description'] ?? 'Course Description').toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  if (!isEnrolled &&
                      (((course['price_rupees'] ?? course['price']) is int)
                          ? (course['price_rupees'] ?? course['price']) as int
                          : num.tryParse((course['price_rupees'] ?? course['price'])?.toString() ?? '')?.toInt() ?? 0) > 0) ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '₹${(num.tryParse((course['price_rupees'] ?? course['price']).toString()) ?? 0).toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppTheme.success,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        if (onBuyNow != null)
                          ElevatedButton(
                            onPressed: onBuyNow,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 0,
                              ),
                              minimumSize: const Size(0, 36),
                            ),
                            child: const Text(
                              'Buy Now',
                              style: TextStyle(fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                  ] else if (!isEnrolled) ...[
                    const SizedBox(height: 8),
                    const Text(
                      'Free',
                      style: TextStyle(
                        color: AppTheme.success,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (isEnrolled) ...[
              const SizedBox(width: 8),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                color: AppTheme.muted,
                size: 16,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool compact;

  const _SectionHeader({
    required this.title,
    required this.subtitle,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        compact ? 0 : 16,
        compact ? 0 : 2,
        compact ? 0 : 16,
        12,
      ),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              subtitle,
              style: const TextStyle(
                color: AppTheme.muted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCourses extends StatelessWidget {
  const _EmptyCourses();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.auto_stories_outlined, color: AppTheme.muted, size: 44),
          SizedBox(height: 10),
          Text('No courses available', style: TextStyle(color: AppTheme.muted)),
        ],
      ),
    );
  }
}

class _SubscriptionStatus extends StatelessWidget {
  final Map<String, dynamic> sub;
  final VoidCallback onTap;

  const _SubscriptionStatus({required this.sub, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = (sub['status'] ?? '').toString();
    final planName = (sub['plan_name'] ?? 'Subscription').toString();
    final isActive = status == 'active' || status == 'authenticated';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isActive ? null : AppTheme.surface,
            gradient: isActive
                ? const LinearGradient(
                    colors: [Color(0xFF1A3A2A), Color(0xFF0F1F18)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isActive ? AppTheme.success.withValues(alpha: 0.3) : AppTheme.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppTheme.success.withValues(alpha: 0.15)
                      : AppTheme.muted.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isActive ? Icons.workspace_premium : Icons.subscriptions_outlined,
                  color: isActive ? AppTheme.success : AppTheme.muted,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isActive ? 'Premium Active' : 'No Active Plan',
                      style: TextStyle(
                        color: isActive ? AppTheme.success : AppTheme.textPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isActive ? planName : 'Subscribe to get premium access',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                color: AppTheme.muted,
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.cloud_off_rounded, color: AppTheme.muted, size: 52),
        const SizedBox(height: 16),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 18),
        ElevatedButton(onPressed: onRetry, child: const Text('RETRY')),
      ],
    );
  }
}
