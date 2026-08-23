import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../services/real_time_service.dart';
import '../theme/app_theme.dart';
import '../utils/class_helper.dart';
import '../utils/responsive.dart';
import '../widgets/course_image.dart';
import '../widgets/yuva/index.dart';
import 'checkout_screen.dart';
import 'pdf_viewer_screen.dart';
import 'quiz_active_screen.dart';

class CourseDetailScreen extends StatefulWidget {
  final Map<String, dynamic> course;
  final bool isEnrolled;

  const CourseDetailScreen({
    super.key,
    required this.course,
    this.isEnrolled = false,
  });

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  List<dynamic> _lessons = [];
  List<dynamic> _liveSessions = [];
  bool _isLoading = true;
  late bool _isEnrolledLocal;
  StreamSubscription? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _isEnrolledLocal = widget.isEnrolled;
    _fetchCourseContent();
    _realtimeSub = RealTimeService.instance.dataStream.listen(_onRealtimeEvent);
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  void _onRealtimeEvent(Map<String, dynamic> event) {
    if (!mounted) return;
    final action = event['action'];
    final entity = event['entity'];
    final data = event['data'] as Map<String, dynamic>?;
    final courseId = (widget.course['id'] ?? '').toString();
    final eventCourseId = data?['courseId']?.toString();

    if (entity == 'enrollment' && action == 'enrollment_success') {
      if (eventCourseId == courseId && !_isEnrolledLocal) {
        setState(() => _isEnrolledLocal = true);
        _fetchCourseContentQuietly();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🎉 Enrolled successfully!')),
        );
      }
      return;
    }

    if (entity == 'lesson' && (action == 'lesson_added' || action == 'lesson_updated')) {
      if (eventCourseId == courseId) _fetchCourseContentQuietly();
      return;
    }

    if (entity == 'progress' && action == 'progress_updated') {
      if (eventCourseId == courseId) {
        final progress = data?['progress'];
        if (progress != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('📚 Progress: $progress%')),
          );
        }
        _fetchCourseContentQuietly();
      }
      return;
    }

    if (entity == 'live_session') {
      if (eventCourseId == null || eventCourseId == courseId) {
        _fetchCourseContentQuietly();
      }
      return;
    }
  }

  Future<void> _fetchCourseContentQuietly() async {
    try {
      final courseId = (widget.course['id'] ?? '').toString();
      if (courseId.isEmpty) return;

      final responses = await Future.wait([
        ApiService.getCourseLessons(courseId),
        ApiService.getLiveSessions(courseId),
      ]);

      if (!mounted) return;
      final lessonsResponse = responses[0];
      final liveResponse = responses[1];
      setState(() {
        if (lessonsResponse.statusCode == 200) {
          _lessons = List<dynamic>.from(lessonsResponse.data['lessons'] ?? []);
        }
        if (liveResponse.statusCode == 200) {
          _liveSessions = List<dynamic>.from(liveResponse.data['sessions'] ?? []);
        }
      });
    } catch (e) {
      debugPrint('Course detail quiet refresh failed: $e');
    }
  }

  Future<void> _fetchCourseContent() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final courseId = (widget.course['id'] ?? '').toString();
      if (courseId.isEmpty) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }

      final responses = await Future.wait([
        ApiService.getCourseLessons(courseId),
        ApiService.getLiveSessions(courseId),
      ]);

      if (!mounted) return;
      final lessonsResponse = responses[0];
      final liveResponse = responses[1];
      setState(() {
        if (lessonsResponse.statusCode == 200) {
          _lessons = List<dynamic>.from(lessonsResponse.data['lessons'] ?? []);
        }
        if (liveResponse.statusCode == 200) {
          _liveSessions = List<dynamic>.from(liveResponse.data['sessions'] ?? []);
        }
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Course detail fetch failed: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  int get _price {
    final priceRupees = widget.course['price_rupees'];
    final price = widget.course['price'];
    if (priceRupees is int) return priceRupees;
    if (price is int) return price;
    return num.tryParse((priceRupees ?? price ?? '').toString())?.toInt() ?? 0;
  }

  bool get _showBuyButton => !_isEnrolledLocal && _price > 0;

  void _buyCourse() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          item: widget.course,
          itemType: 'course',
          amountInr: _price,
        ),
      ),
    ).then((success) {
      if (success == true) {
        setState(() => _isEnrolledLocal = true);
        _fetchCourseContent();
      }
    });
  }

  void _openVideoPlayer(String videoUrl, String? lessonId) {
    final url = videoUrl.trim();
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Video URL missing है')),
      );
      return;
    }
    if (lessonId == null || lessonId.isEmpty || lessonId == 'null') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lesson ID missing है, progress track nahi hoga')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VideoPlayerScreen(
          videoUrl: url,
          courseId: widget.course['id']?.toString(),
          lessonId: lessonId,
        ),
      ),
    );
  }

  void _handleLessonTap(Map<String, dynamic> lessonMap) {
    if (lessonMap['is_locked'] == true) {
      final lockedReason = lessonMap['locked_reason'] ?? 'premium';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            lockedReason == 'sequential'
                ? 'अगला लेसन देखने के लिए कृपया पहले पिछला लेसन/क्विज़ पूरा करें।'
                : 'यह एक प्रीमियम लेसन है। इसे देखने के लिए कृपया कोर्स खरीदें।',
          ),
        ),
      );
      return;
    }

    final type = (lessonMap['type'] ?? '').toString();
    final contentUrl = lessonMap['content_url']?.toString() ?? '';
    final lessonId = lessonMap['id']?.toString();

    if ((type == 'video' || type == 'recording') && contentUrl.isNotEmpty) {
      var videoUrl = contentUrl;
      if (!videoUrl.startsWith('http')) {
        videoUrl = videoUrl.startsWith('/')
            ? '${ApiService.baseUrl}$videoUrl'
            : '${ApiService.baseUrl}/$videoUrl';
      }
      _openVideoPlayer(videoUrl, lessonId);
    } else if (type == 'live') {
      final matchingSession = _liveSessions.whereType<Map<String, dynamic>>().firstWhere(
        (session) => session['title'] == lessonMap['title'],
        orElse: () => _liveSessions.isNotEmpty
            ? Map<String, dynamic>.from(_liveSessions.first as Map)
            : <String, dynamic>{},
      );
      ClassHelper.joinLiveClass(context, {
        ...matchingSession,
        'title': lessonMap['title'],
        'course_id': widget.course['id'],
      });
    } else if (type == 'quiz') {
      if (lessonMap['exam_id'] == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No quiz linked to this lesson.')),
        );
        return;
      }
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => QuizActiveScreen(quiz: {
            'id': lessonMap['exam_id'],
            'title': lessonMap['title'],
          }),
        ),
      ).then((_) => _fetchCourseContent());
    } else if (type == 'audio' && contentUrl.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Audio player coming soon')),
      );
    } else if (type == 'pdf' && contentUrl.isNotEmpty) {
      var pdfUrl = contentUrl;
      if (!pdfUrl.startsWith('http')) {
        pdfUrl = pdfUrl.startsWith('/')
            ? '${ApiService.baseUrl}$pdfUrl'
            : '${ApiService.baseUrl}/$pdfUrl';
      }
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PdfViewerScreen(
            pdfUrl: pdfUrl,
            title: lessonMap['title']?.toString() ?? 'PDF Lesson',
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('App preview में अभी video/live lessons supported हैं')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final courseTitle = (widget.course['title'] ?? 'Course Details').toString();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(
          courseTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.surface,
              ),
        ),
        backgroundColor: AppTheme.primary.withAlphaOpacity(0.4),
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.surface),
      ),
      body: Container(
        color: AppTheme.backgroundOf(context),
        child: SafeArea(
          child: ResponsiveLayout(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surfaceOf(context),
              onRefresh: _fetchCourseContent,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        SliverToBoxAdapter(child: _CourseHero(course: widget.course)),
                        if (_showBuyButton)
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space4),
                              child: _BuyCourseCard(price: _price, onBuy: _buyCourse),
                            ),
                          ),
                        if (_liveSessions.isNotEmpty) ...[
                          SliverToBoxAdapter(
                            child: SectionHeader(
                              title: 'Live Classes',
                              actionLabel: 'Schedule',
                              onAction: null,
                            ),
                          ),
                          SliverToBoxAdapter(
                            child: SizedBox(
                              height: 210,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
                                itemCount: _liveSessions.length,
                                separatorBuilder: (_, __) => const SizedBox(width: AppTheme.space3),
                                itemBuilder: (context, index) {
                                  final session = Map<String, dynamic>.from(_liveSessions[index] as Map);
                                  return LiveClassCardV2(
                                    session: session,
                                    isLive: session['status']?.toString() == 'live',
                                    onJoin: () => ClassHelper.joinLiveClass(
                                      context,
                                      session,
                                      defaultTitle: widget.course['title']?.toString(),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space4)),
                        ],
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
                            child: Text(
                              'Lessons',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                    color: AppTheme.textPrimaryOf(context),
                                    fontSize: 24,
                                  ),
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space3)),
                        if (_lessons.isEmpty)
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.all(AppTheme.space4),
                              child: YuvaEmptyState.noData(title: 'No lessons found'),
                            ),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space6),
                            sliver: SliverList.separated(
                              itemCount: _lessons.length,
                              separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space3),
                              itemBuilder: (context, index) {
                                final lesson = Map<String, dynamic>.from(_lessons[index] as Map);
                                return LessonTileV2(
                                  lesson: lesson,
                                  index: index,
                                  onTap: () => _handleLessonTap(lesson),
                                );
                              },
                            ),
                          ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseHero extends StatelessWidget {
  final Map<String, dynamic> course;

  const _CourseHero({required this.course});

  @override
  Widget build(BuildContext context) {
    final description = (course['description'] ?? 'Learn with Adityanveshan.').toString();

    return Container(
      padding: const EdgeInsets.fromLTRB(AppTheme.space4, AppTheme.space6, AppTheme.space4, AppTheme.space5),
      decoration: BoxDecoration(
        gradient: AppTheme.auroraGradient,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(AppTheme.radius2Xl),
          bottomRight: Radius.circular(AppTheme.radius2Xl),
        ),
        boxShadow: AppTheme.mediumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CourseImage(
                course: course,
                width: 84,
                height: 84,
                borderRadius: AppTheme.radiusLg,
              ),
              const SizedBox(width: AppTheme.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (course['title'] ?? 'Course').toString(),
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: AppTheme.surface,
                            fontSize: 24,
                          ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppTheme.space2),
                    _StatsRow(course: course),
                  ],
                ),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: AppTheme.space4),
            Text(
              description,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.surface.withAlphaOpacity(0.85),
                    height: 1.5,
                  ),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final Map<String, dynamic> course;

  const _StatsRow({required this.course});

  @override
  Widget build(BuildContext context) {
    final lessonCount = (course['lessons_count'] ?? course['total_lessons'] ?? 0).toString();
    final level = (course['level'] ?? 'All Levels').toString();

    return Row(
      children: [
        _StatPill(icon: Icons.play_lesson_rounded, label: '$lessonCount lessons'),
        const SizedBox(width: AppTheme.space2),
        _StatPill(icon: Icons.signal_cellular_alt_rounded, label: level),
      ],
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.surface.withAlphaOpacity(0.2),
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppTheme.surface, size: 14),
          const SizedBox(width: 5),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.surface,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
          ),
        ],
      ),
    );
  }
}

class _BuyCourseCard extends StatelessWidget {
  final int price;
  final VoidCallback onBuy;

  const _BuyCourseCard({required this.price, required this.onBuy});

  @override
  Widget build(BuildContext context) {
    return YuvaCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Premium Access',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                      ),
                ),
                const SizedBox(height: AppTheme.space1),
                Text(
                  '₹${price.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppTheme.success,
                        fontSize: 26,
                      ),
                ),
              ],
            ),
          ),
          YuvaButton.primary(label: 'Buy Now', onPressed: onBuy, height: 48),
        ],
      ),
    );
  }
}

class VideoPlayerScreen extends StatefulWidget {
  final String videoUrl;
  final String? courseId;
  final String? lessonId;

  const VideoPlayerScreen({
    super.key,
    required this.videoUrl,
    this.courseId,
    this.lessonId,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen>
    with WidgetsBindingObserver {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  String? _error;
  var _isPipSupported = false;
  var _isEnteringPip = false;
  int _lastReportedProgress = 0;
  VoidCallback? _progressListener;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializePictureInPicture();
    _initializePlayer();
  }

  Future<void> _initializePictureInPicture() async {
    final supported = await PictureInPictureService.isSupported();
    if (mounted) setState(() => _isPipSupported = supported);
  }

  Future<void> _enterPictureInPicture() async {
    if (_isEnteringPip || !_isPipSupported) return;
    setState(() => _isEnteringPip = true);
    await PictureInPictureService.enter();
    if (mounted) setState(() => _isEnteringPip = false);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _enterPictureInPicture();
    }
  }

  Future<void> _initializePlayer() async {
    try {
      final headers = await ApiService.getHeaders();
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
        httpHeaders: headers,
        videoPlayerOptions: const VideoPlayerOptions(),
      );
      _videoPlayerController = controller;

      _chewieController = ChewieController(
        videoPlayerController: controller,
        autoPlay: true,
        looping: false,
        autoInitialize: true,
        showControlsOnInitialize: false,
        placeholder: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppTheme.primaryLight),
              SizedBox(height: 16),
              Text('Video Load ho raha hai...', style: TextStyle(color: Colors.white70)),
            ],
          ),
        ),
        materialProgressColors: ChewieProgressColors(
          playedColor: AppTheme.primary,
          handleColor: AppTheme.primaryLight,
          backgroundColor: Colors.grey,
          bufferedColor: Colors.white30,
        ),
      );

      controller.addListener(_progressListener = () {
        if (!mounted) return;
        if (!controller.value.isInitialized) return;
        final position = controller.value.position.inSeconds;
        final duration = controller.value.duration.inSeconds;
        if (duration > 0 && widget.courseId != null && widget.lessonId != null) {
          final progress = ((position / duration) * 100).toInt();
          int targetProgress = 0;
          if (progress >= 100) { targetProgress = 100; }
          else if (progress >= 75) { targetProgress = 75; }
          else if (progress >= 50) { targetProgress = 50; }
          else if (progress >= 25) { targetProgress = 25; }

          if (targetProgress > _lastReportedProgress) {
            _lastReportedProgress = targetProgress;
            ApiService.completeLesson(widget.courseId!, widget.lessonId!, position).then(
              (_) {},
              onError: (_) {},
            );
          }
        }
      });

      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) setState(() => _error = 'Video setup nahi ho paya');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (_progressListener != null && _videoPlayerController != null) {
      _videoPlayerController!.removeListener(_progressListener!);
    }
    _chewieController?.dispose();
    _videoPlayerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        actions: [
          if (_isPipSupported)
            IconButton(
              tooltip: 'Mini player',
              onPressed: _isEnteringPip ? null : _enterPictureInPicture,
              icon: const Icon(Icons.picture_in_picture_alt),
            ),
        ],
      ),
      body: Center(
        child: _error != null
            ? Text(_error!, style: TextStyle(color: AppTheme.textPrimaryOf(context)))
            : _chewieController != null
                ? Chewie(controller: _chewieController!)
                : const CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}