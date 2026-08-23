import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import '../utils/class_helper.dart';
import '../utils/responsive.dart';
import '../services/real_time_service.dart';
import '../widgets/yuva/index.dart';
import 'books_screen.dart';
import 'checkout_screen.dart';
import 'course_detail_screen.dart';
import 'profile_screen.dart';
import 'quiz_list_screen.dart';
import 'subscription_screen.dart';
import 'wallet_screen.dart';
import 'yagya_mitra_screen.dart';

class DashboardScreen extends StatefulWidget {
  DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static String _cacheKey = 'dashboard_cache';
  static String _cacheTimeKey = 'dashboard_cache_time';
  static int _cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  List<dynamic> _enrolledCourses = [];
  List<dynamic> _availableCourses = [];
  List<dynamic> _todayLive = [];
  List<dynamic> _tomorrowLive = [];
  Map<String, dynamic>? _mySub;
  bool _isLoading = true;
  bool _isShowingCached = false;
  String? _error;

  StreamSubscription<Map<String, dynamic>>? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
    _realtimeSub = RealTimeService.instance.dataStream.listen((event) async {
      if (!mounted) return;
      final entity = event['entity'];
      final action = event['action'];
      if (entity == 'wallet' ||
          entity == 'enrollment' ||
          entity == 'live_session' ||
          action == 'course_published' ||
          event['type'] == 'wallet') {
        await _refreshDashQuietly();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchDashboard({bool skipCache = false}) async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _isShowingCached = false;
      _error = null;
    });

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

    try {
      final dashboardFuture = ApiService.getDashboardData();
      final subFuture = ApiService.getUserSubscription();

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
        final data = response.data;
        if (subResponse != null && subResponse.statusCode == 200) {
          _mySub = subResponse.data['subscription'];
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

  Future<void> _refreshDashQuietly() async {
    try {
      final response = await ApiService.getDashboardData();
      if (mounted && response.statusCode == 200) {
        final data = response.data;
        setState(() => _applyDashboardData(data));
        await _cacheDashboard(data);
      }
    } catch (e) {
      debugPrint('Dashboard quiet refresh failed: $e');
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

  void _buyCourse(Map<String, dynamic> course) {
    final priceRaw = course['price_rupees'] ?? course['price'];
    final amount = priceRaw is int
        ? priceRaw
        : num.tryParse(priceRaw?.toString() ?? '')?.toInt() ?? 0;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          item: course,
          itemType: 'course',
          amountInr: amount,
        ),
      ),
    ).then((success) {
      if (success == true && mounted) _fetchDashboard();
    });
  }

  void _navToScreen(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  List<Map<String, dynamic>> _dedupedSessions() {
    final seen = <String>{};
    final all = [..._todayLive, ..._tomorrowLive].whereType<Map<String, dynamic>>().where((s) {
      final id = (s['id'] ?? s['sessionId'] ?? '').toString();
      return id.isEmpty ? true : seen.add(id);
    }).toList();
    return all;
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    final enrolledList = _enrolledCourses.whereType<Map<String, dynamic>>().toList();
    final enrolledIds = enrolledList
        .map((e) => (e['id'] ?? e['slug'] ?? '').toString())
        .toSet();
    final exploreList = _availableCourses
        .whereType<Map<String, dynamic>>()
        .where((c) => !enrolledIds.contains((c['id'] ?? c['slug'] ?? '').toString()))
        .toList();
    final liveSessions = _dedupedSessions();
    final liveNow = liveSessions.where((s) => s['status']?.toString() == 'live').toList();
    final upcoming = liveSessions.where((s) => s['status']?.toString() != 'live').toList();

    return Container(
      color: AppTheme.backgroundOf(context),
      child: SafeArea(
        child: ResponsiveLayout(
          child: RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surfaceOf(context),
            onRefresh: () => _fetchDashboard(skipCache: true),
            child: _isLoading
                ? _DashboardLoading()
                : _error != null
                    ? _ErrorState(message: _error!, onRetry: _fetchDashboard)
                    : CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          if (_isShowingCached)
                            const SliverToBoxAdapter(
                              child: _CachedRefreshingBar(),
                            ),
                          SliverToBoxAdapter(
                            child: DashboardHeader(
                              onNotificationTap: () => _showSnack('Notifications'),
                              onAvatarTap: () => _navToScreen(ProfileScreen()),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space4)),
                          if (enrolledList.isNotEmpty)
                            SliverToBoxAdapter(
                              child: ContinueLearningCard(
                                course: enrolledList.first,
                                onTap: () => _openCourse(enrolledList.first, true),
                              ),
                            ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
                          SliverToBoxAdapter(
                            child: QuickActionsGrid(
                              onAskAi: () => _navToScreen(YagyaMitraScreen()),
                              onAddMoney: () => _navToScreen(WalletScreen()),
                              onLibrary: () => _navToScreen(BooksScreen()),
                              onQuiz: () => _navToScreen(QuizListScreen()),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space6)),
                          if (liveSessions.isNotEmpty) ...[
                            SliverToBoxAdapter(
                              child: SectionHeader(
                                title: 'Live Classes',
                                actionLabel: liveNow.isNotEmpty ? 'Join Now' : null,
                                onAction: liveNow.isNotEmpty ? () => ClassHelper.joinLiveClass(context, liveNow.first) : null,
                              ),
                            ),
                            SliverToBoxAdapter(
                              child: SizedBox(
                                height: 220,
                                child: _LiveList(
                                  liveNow: liveNow,
                                  upcoming: upcoming,
                                ),
                              ),
                            ),
                            const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
                          ],
                          if (_mySub != null) ...[
                            SliverToBoxAdapter(
                              child: SubscriptionStatusCard(
                                sub: _mySub!,
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => SubscriptionScreen()),
                                ).then((_) => _fetchDashboard()),
                              ),
                            ),
                            const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
                          ],
                          if (enrolledList.isNotEmpty) ...[
                            SliverToBoxAdapter(
                              child: SectionHeader(
                                title: 'My Courses',
                                actionLabel: 'View all',
                                onAction: () {},
                              ),
                            ),
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space4),
                              sliver: SliverList.separated(
                                itemCount: enrolledList.length,
                                separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space3),
                                itemBuilder: (context, index) => CourseCardV2(
                                  course: enrolledList[index],
                                  isEnrolled: true,
                                  index: index,
                                  onTap: () => _openCourse(enrolledList[index], true),
                                ),
                              ),
                            ),
                          ],
                          SliverToBoxAdapter(
                            child: SectionHeader(
                              title: 'Explore Courses',
                              actionLabel: exploreList.isNotEmpty ? 'See all' : null,
                              onAction: exploreList.isNotEmpty ? () {} : null,
                            ),
                          ),
                          if (exploreList.isEmpty)
                            const SliverToBoxAdapter(
                              child: Padding(
                                padding: EdgeInsets.all(AppTheme.space6),
                                child: YuvaEmptyState.noData(
                                  title: 'No courses available',
                                  subtitle: 'New courses will appear here soon.',
                                ),
                              ),
                            )
                          else
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space6),
                              sliver: SliverList.separated(
                                itemCount: exploreList.length,
                                separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space3),
                                itemBuilder: (context, index) => CourseCardV2(
                                  course: exploreList[index],
                                  isEnrolled: false,
                                  index: index,
                                  onTap: () => _openCourse(exploreList[index], false),
                                  onBuyNow: () => _buyCourse(exploreList[index]),
                                ),
                              ),
                            ),
                        ],
                      ),
          ),
        ),
      ),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _DashboardLoading extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          YuvaShimmerCard(height: 64, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 180, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 96, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 220, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          ...List.generate(3, (_) => YuvaShimmerCard(height: 110)),
        ],
      ),
    );
  }
}

class _CachedRefreshingBar extends StatelessWidget {
  const _CachedRefreshingBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.space2),
      color: AppTheme.primary.withAlphaOpacity(0.1),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: Row(
        children: [
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
          ),
          const SizedBox(width: 10),
          Text(
            'Cached data — Refreshing…',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}

class _LiveList extends StatelessWidget {
  final List<Map<String, dynamic>> liveNow;
  final List<Map<String, dynamic>> upcoming;

  const _LiveList({required this.liveNow, required this.upcoming});

  @override
  Widget build(BuildContext context) {
    final items = [...liveNow, ...upcoming];
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(width: AppTheme.space3),
      itemBuilder: (context, index) {
        final session = items[index];
        return LiveClassCardV2(
          session: session,
          isLive: session['status']?.toString() == 'live',
          onJoin: () => ClassHelper.joinLiveClass(context, session),
        );
      },
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
      padding: const EdgeInsets.all(AppTheme.space6),
      children: [
        const SizedBox(height: 80),
        YuvaEmptyState.error(
          title: message,
          actionLabel: 'Try Again',
          onAction: onRetry,
        ),
      ],
    );
  }
}