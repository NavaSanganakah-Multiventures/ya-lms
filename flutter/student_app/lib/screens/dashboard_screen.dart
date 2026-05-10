import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'course_detail_screen.dart';
import 'live_class_webview_screen.dart';

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
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
  }

  Future<void> _fetchDashboard() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ApiService.getDashboardData();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _enrolledCourses = data['enrolledCourses'] ?? [];
          _availableCourses = data['availableCourses'] ?? [];
          _todayLive = data['todayLive'] ?? [];
          _tomorrowLive = data['tomorrowLive'] ?? [];
          _isLoading = false;
        });
        return;
      }

      await _fetchCoursesFallback();
    } catch (_) {
      await _fetchCoursesFallback();
    }
  }

  Future<void> _fetchCoursesFallback() async {
    try {
      final response = await ApiService.getCourses();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _availableCourses = data['courses'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Dashboard load नहीं हो पाया';
          _isLoading = false;
        });
      }
    } catch (_) {
      setState(() {
        _error = 'Internet या server connection check करें';
        _isLoading = false;
      });
    }
  }

  void _openCourse(Map<String, dynamic> course) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => CourseDetailScreen(course: course)),
    ).then((_) => _fetchDashboard());
  }

  void _joinLiveClass(Map<String, dynamic> session) {
    final courseId = (session['course_id'] ?? session['courseId'] ?? '').toString();
    if (courseId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Course ID missing है')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LiveClassWebViewScreen(
          courseId: courseId,
          title: session['title'] ?? 'Live Class',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final allCourses = [..._enrolledCourses, ..._availableCourses];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: _fetchDashboard,
          ),
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.elevated,
        onRefresh: _fetchDashboard,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : _error != null
                ? _ErrorState(message: _error!, onRetry: _fetchDashboard)
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      SliverToBoxAdapter(child: _HeroSection(user: user)),
                      SliverToBoxAdapter(
                        child: _LiveClassSection(
                          todayLive: _todayLive,
                          tomorrowLive: _tomorrowLive,
                          onJoin: _joinLiveClass,
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: _SectionHeader(
                          title: _enrolledCourses.isNotEmpty ? 'My Courses' : 'Available Courses',
                          subtitle: '${allCourses.length} courses',
                        ),
                      ),
                      if (allCourses.isEmpty)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: _EmptyCourses(),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          sliver: SliverList.separated(
                            itemCount: allCourses.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final course = Map<String, dynamic>.from(allCourses[index]);
                              final isEnrolled = index < _enrolledCourses.length;
                              return _CourseCard(
                                course: course,
                                isEnrolled: isEnrolled,
                                onTap: () => _openCourse(course),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  final Map<String, dynamic>? user;

  const _HeroSection({required this.user});

  @override
  Widget build(BuildContext context) {
    final name = user?['full_name'] ?? user?['name'] ?? 'Student';
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 18),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1F130B), Color(0xFF111111)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0x22EA580C),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0x44EA580C)),
            ),
            child: const Text(
              'SWADHYAYA VEDIKA',
              style: TextStyle(color: AppTheme.primaryLight, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Namaste, $name',
            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.8),
          ),
          const SizedBox(height: 8),
          const Text(
            'Aaj ki live class, enrolled courses aur learning material ek hi jagah.',
            style: TextStyle(color: AppTheme.muted, height: 1.5),
          ),
        ],
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
            subtitle: 'Student dashboard wali list',
            compact: true,
          ),
          if (sessions.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Column(
                children: [
                  Icon(Icons.videocam_off_outlined, color: AppTheme.muted, size: 34),
                  SizedBox(height: 10),
                  Text('Aaj ya kal koi live class scheduled नहीं है', style: TextStyle(color: AppTheme.muted)),
                ],
              ),
            )
          else
            SizedBox(
              height: 178,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: sessions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final session = Map<String, dynamic>.from(sessions[index]);
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

  const _LiveClassCard({required this.session, required this.isTomorrow, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    final status = (session['status'] ?? 'scheduled').toString();
    final canJoin = status == 'live' || !isTomorrow;
    return Container(
      width: 286,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: status == 'live' ? const Color(0x221C0707) : AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: status == 'live' ? const Color(0x66DC2626) : AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(status == 'live' ? Icons.fiber_manual_record : Icons.calendar_month, color: status == 'live' ? AppTheme.danger : AppTheme.primaryLight, size: 16),
              const SizedBox(width: 8),
              Text(
                status == 'live' ? 'LIVE NOW' : (isTomorrow ? 'TOMORROW' : 'TODAY'),
                style: TextStyle(color: status == 'live' ? AppTheme.danger : AppTheme.primaryLight, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.2),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            session['title'] ?? 'Live Class',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            session['course_title'] ?? 'Course',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
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
  final VoidCallback onTap;

  const _CourseCard({required this.course, required this.isEnrolled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: const Color(0x22EA580C),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.menu_book_rounded, color: AppTheme.primaryLight),
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
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0x2222C55E), borderRadius: BorderRadius.circular(999)),
                          child: const Text('ENROLLED', style: TextStyle(color: AppTheme.success, fontSize: 9, fontWeight: FontWeight.w900)),
                        ),
                      Expanded(
                        child: Text(
                          course['title'] ?? 'Course Title',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    course['description'] ?? 'Course Description',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.muted, size: 16),
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

  const _SectionHeader({required this.title, required this.subtitle, this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(compact ? 0 : 16, compact ? 0 : 2, compact ? 0 : 16, 12),
      child: Row(
        children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(width: 10),
          Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12, fontWeight: FontWeight.w600)),
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
      child: Text('No courses available', style: TextStyle(color: AppTheme.muted)),
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
        Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 18),
        ElevatedButton(onPressed: onRetry, child: const Text('RETRY')),
      ],
    );
  }
}
