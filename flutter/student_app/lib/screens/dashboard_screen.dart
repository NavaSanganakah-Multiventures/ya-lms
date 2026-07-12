import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'course_detail_screen.dart';
import 'checkout_screen.dart';
import 'subscription_screen.dart';
import '../utils/api_utils.dart';
import '../utils/class_helper.dart';
import '../utils/responsive.dart';
import 'quiz_list_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<dynamic> _enrolledCourses = [];
  List<dynamic> _availableCourses = [];
  List<dynamic> _todayLive = [];
  List<dynamic> _tomorrowLive = [];
  Map<String, dynamic>? _mySub;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
  }

  Future<void> _fetchDashboard() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        ApiService.getDashboardData(),
        ApiService.getUserSubscription(),
      ]);
      final response = results[0];
      final subResponse = results[1];
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (subResponse.statusCode == 200) {
          final subData = jsonDecode(subResponse.body);
          _mySub = subData['subscription'];
        }
        setState(() {
          _enrolledCourses = ApiUtils.extractList(data, 'enrolledCourses');
          _availableCourses = List<dynamic>.from(
            data['availableCourses'] ?? [],
          );
          _todayLive = ApiUtils.extractList(data, 'todayLive');
          _tomorrowLive = ApiUtils.extractList(data, 'tomorrowLive');
          _isLoading = false;
        });
        return;
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        setState(() {
          _error = 'Session expired. कृपया दोबारा login करें।';
          _isLoading = false;
        });
        return;
      }

      await _fetchCoursesFallback();
    } catch (_) {
      if (!mounted) return;
      await _fetchCoursesFallback();
    }
  }

  Future<void> _fetchCoursesFallback() async {
    try {
      final response = await ApiService.getCourses();
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _availableCourses = ApiUtils.extractList(data, 'courses');
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Dashboard load नहीं हो पाया (${response.statusCode})';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Network Error: Internet connection check करें';
        _isLoading = false;
      });
    }
  }

  void _openCourse(Map<String, dynamic> course, bool isEnrolled) {
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
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final enrolledList = _enrolledCourses.cast<Map<String, dynamic>>().toList();

    // Filter available courses to only show those not in enrolled
    final enrolledIds = enrolledList
        .map((e) => (e['id'] ?? e['slug'] ?? '').toString())
        .toSet();
    final exploreList = _availableCourses
        .cast<Map<String, dynamic>>()
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
              onRefresh: _fetchDashboard,
              child: _isLoading
                  ? const _DashboardLoading()
                  : _error != null
                  ? _ErrorState(message: _error!, onRetry: _fetchDashboard)
                  : CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        SliverToBoxAdapter(
                          child: _HeroSection(
                            user: user,
                            courseCount: enrolledList.length + exploreList.length,
                            liveCount: _todayLive.length + _tomorrowLive.length,
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
                          child: _LiveClassSection(
                            todayLive: _todayLive,
                            tomorrowLive: _tomorrowLive,
                            onJoin: (session) => ClassHelper.joinLiveClass(context, session),
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
                                          amountRupees: ((course['price_rupees'] ?? course['price']) is int)
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

  const _HeroSection({
    required this.user,
    required this.courseCount,
    required this.liveCount,
  });

  @override
  Widget build(BuildContext context) {
    final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppTheme.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000), // Very soft natural shadow
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
              Icons.spa_rounded, // Natural/Spiritual blend icon
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
                  _HeroStat(value: '$liveCount', label: 'Live slots'),
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

  const _HeroStat({required this.value, required this.label});

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
              style: const TextStyle(
                color: AppTheme.primary,
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.textSecondary,
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
    final sessions = [...todayLive, ...tomorrowLive];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
            title: 'Live Classes',
            subtitle: 'Today & tomorrow',
            compact: true,
          ),
          if (sessions.isEmpty)
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
                  Icon(
                    Icons.nights_stay_outlined,
                    color: AppTheme.secondaryLight,
                    size: 38,
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Aaj ya kal koi live class scheduled नहीं है',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              height: 196,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: sessions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final session = sessions[index] is Map
                      ? Map<String, dynamic>.from(sessions[index])
                      : <String, dynamic>{};
                  return _LiveClassCard(
                    session: session,
                    isTomorrow: index >= todayLive.length,
                    onJoin: () => onJoin(session),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _LiveClassCard extends StatelessWidget {
  final Map<String, dynamic> session;
  final bool isTomorrow;
  final VoidCallback onJoin;

  const _LiveClassCard({
    required this.session,
    required this.isTomorrow,
    required this.onJoin,
  });

  static String _formatTime(String raw) {
    if (raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw).toLocal();
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
    final status = (session['status'] ?? 'scheduled').toString();
    final canJoin = status == 'live';
    final rawStartsAt =
        (session['start_time'] ??
                session['starts_at'] ??
                session['scheduled_at'] ??
                '')
            .toString();
    final startsAt = _formatTime(rawStartsAt);
    return Container(
      width: 292,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: status == 'live'
            ? AppTheme.sacredGradient
            : const LinearGradient(
                colors: [AppTheme.elevated, AppTheme.surface],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: status == 'live' ? const Color(0x88EF4444) : AppTheme.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                status == 'live'
                    ? Icons.fiber_manual_record
                    : Icons.calendar_month,
                color: status == 'live'
                    ? AppTheme.danger
                    : AppTheme.primaryLight,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                status == 'live'
                    ? 'LIVE NOW'
                    : (isTomorrow ? 'TOMORROW' : 'TODAY'),
                style: TextStyle(
                  color: status == 'live'
                      ? AppTheme.danger
                      : AppTheme.primaryLight,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              const Icon(
                Icons.wifi_tethering_rounded,
                color: AppTheme.textSecondary,
                size: 18,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            (session['title'] ?? 'Live Class').toString(),
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
            (session['course_title'] ?? 'Course').toString(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
          if (startsAt.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              startsAt,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppTheme.mutedSoft, fontSize: 11),
            ),
          ],
          const Spacer(),
          ElevatedButton.icon(
            onPressed: canJoin ? onJoin : null,
            icon: const Icon(Icons.play_arrow_rounded),
            label: Text(canJoin ? 'JOIN CLASS' : 'SCHEDULED'),
          ),
        ],
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
              width: 62,
              height: 62,
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
                          '₹${course['price_rupees'] ?? course['price']}',
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
              Icon(
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
