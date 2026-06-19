import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../theme/app_theme.dart';
import 'live_class_realtimekit_screen.dart';

class CourseDetailScreen extends StatefulWidget {
  final Map<String, dynamic> course;

  const CourseDetailScreen({super.key, required this.course});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  List<dynamic> _lessons = [];
  List<dynamic> _liveSessions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCourseContent();
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
          _lessons = List<dynamic>.from(jsonDecode(lessonsResponse.body)['lessons'] ?? []);
        }
        if (liveResponse.statusCode == 200) {
          _liveSessions = List<dynamic>.from(jsonDecode(liveResponse.body)['sessions'] ?? []);
        }
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openVideoPlayer(String videoUrl) {
    final url = videoUrl.trim();
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Video URL missing है')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VideoPlayerScreen(
          videoUrl: url,
          courseId: widget.course['id']?.toString(),
        ),
      ),
    );
  }

  void _joinLiveClass(Map<String, dynamic> session) {
    final meetingId = _readSessionValue(session, [
      'rtc_room_id',
      'meetingId',
      'meeting_id',
      'roomId',
      'room_id',
    ]);
    final sessionId = _readSessionValue(
      session,
      ['id', 'sessionId', 'session_id'],
    );
    if (meetingId.isEmpty && sessionId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Live class session ID missing है')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LiveClassRealtimeKitScreen(
          meetingId: meetingId.isEmpty ? null : meetingId,
          sessionId: sessionId.isEmpty ? null : sessionId,
          title: (session['title'] ?? widget.course['title'] ?? 'Live Class').toString(),
        ),
      ),
    );
  }

  String _readSessionValue(Map<String, dynamic> session, List<String> keys) {
    for (final key in keys) {
      final value = session[key]?.toString().trim();
      if (value != null && value.isNotEmpty && value != 'null') return value;
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final courseTitle = widget.course['title'] ?? 'Course Details';
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(title: Text(courseTitle.toString(), maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topLeft,
            radius: 1.2,
            colors: [Color(0x6632115F), AppTheme.background],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.elevated,
        onRefresh: _fetchCourseContent,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                children: [
                  _CourseHero(course: widget.course),
                  const SizedBox(height: 22),
                  _LiveSessionsList(sessions: _liveSessions, onJoin: _joinLiveClass),
                  const SizedBox(height: 22),
                  const Text('Lessons', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 12),
                  if (_lessons.isEmpty)
                    const _EmptyPanel(message: 'No lessons found')
                  else
                    ..._lessons.map((lesson) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _LessonTile(
                            lesson: Map<String, dynamic>.from(lesson),
                            onTap: () {
                              final lessonMap = Map<String, dynamic>.from(lesson as Map);
                              if ((lessonMap['type'] == 'video' || lessonMap['type'] == 'recording') &&
                                  (lessonMap['content_url'] != null || lessonMap['audio_url'] != null)) {
                                var videoUrl = (lessonMap['audio_url'] ?? lessonMap['content_url']).toString();
                                if (!videoUrl.startsWith('http')) {
                                  videoUrl = '${ApiService.baseUrl}/api/courses/${widget.course['id']}/lessons/${lessonMap['id']}/download';
                                }
                                _openVideoPlayer(videoUrl);
                              } else if (lessonMap['type'] == 'live') {
                                final matchingSession = _liveSessions.cast<Map<String, dynamic>>().firstWhere(
                                  (session) => session['title'] == lessonMap['title'],
                                  orElse: () => (_liveSessions.isNotEmpty
                                      ? Map<String, dynamic>.from(_liveSessions.first as Map)
                                      : const <String, dynamic>{}),
                                );
                                _joinLiveClass({
                                  ...matchingSession,
                                  'title': lessonMap['title'],
                                  'course_id': widget.course['id'],
                                });
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('App preview में अभी video/live lessons supported हैं')),
                                );
                              }
                            },
                          ),
                        )),
                ],
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
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppTheme.auroraGradient,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0x44FFFFFF)),
        boxShadow: const [BoxShadow(color: Color(0x4432115F), blurRadius: 28, offset: Offset(0, 16))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              gradient: AppTheme.sacredGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.auto_stories_rounded, color: Colors.white, size: 34),
          ),
          const SizedBox(height: 14),
          Text((course['title'] ?? 'Course').toString(), style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -0.7)),
          const SizedBox(height: 8),
          Text((course['description'] ?? 'Learn with Adityanveshan.').toString(), style: const TextStyle(color: Color(0xFFE9D5FF), height: 1.5)),
        ],
      ),
    );
  }
}

class _LiveSessionsList extends StatelessWidget {
  final List<dynamic> sessions;
  final void Function(Map<String, dynamic> session) onJoin;

  const _LiveSessionsList({required this.sessions, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Live Classes', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        if (sessions.isEmpty)
          const _EmptyPanel(message: 'इस course में कोई live class नहीं है')
        else
          ...sessions.map((session) {
            final item = Map<String, dynamic>.from(session);
            final status = (item['status'] ?? 'scheduled').toString();
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: status == 'live' ? const Color(0x66DC2626) : AppTheme.border),
                ),
                child: Row(
                  children: [
                    Icon(status == 'live' ? Icons.fiber_manual_record : Icons.videocam_outlined, color: status == 'live' ? AppTheme.danger : AppTheme.primaryLight),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['title'] ?? 'Live Class', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                          const SizedBox(height: 4),
                          Text(status.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                    TextButton.icon(
                      onPressed: status == 'ended' ? null : () => onJoin(item),
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('Join'),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _LessonTile extends StatelessWidget {
  final Map<String, dynamic> lesson;
  final VoidCallback onTap;

  const _LessonTile({required this.lesson, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final type = (lesson['type'] ?? '').toString();
    final icon = switch (type) {
      'video' => Icons.play_circle_outline_rounded,
      'recording' => Icons.video_library_outlined,
      'live' => Icons.live_tv_rounded,
      'pdf' => Icons.picture_as_pdf_outlined,
      'audio' => Icons.audiotrack_outlined,
      _ => Icons.insert_drive_file_outlined,
    };

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primaryLight),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(lesson['title'] ?? 'Untitled Lesson', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(type.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.muted),
          ],
        ),
      ),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  final String message;

  const _EmptyPanel({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.muted)),
    );
  }
}

class VideoPlayerScreen extends StatefulWidget {
  final String videoUrl;
  final String? courseId;

  const VideoPlayerScreen({super.key, required this.videoUrl, this.courseId});

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> with WidgetsBindingObserver {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  String? _error;
  var _isPipSupported = false;
  var _isEnteringPip = false;
  int _lastReportedProgress = 0;

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
      final controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      _videoPlayerController = controller;
      await controller.initialize();
      _chewieController = ChewieController(
        videoPlayerController: controller,
        autoPlay: true,
        looping: false,
      );

      controller.addListener(() {
        if (!mounted) return;
        if (!controller.value.isInitialized) return;
        final position = controller.value.position.inSeconds;
        final duration = controller.value.duration.inSeconds;
        if (duration > 0 && widget.courseId != null) {
          final progress = ((position / duration) * 100).toInt();
          // Report progress at 10% intervals and 100%
          if (progress >= 100 && _lastReportedProgress < 100) {
            _lastReportedProgress = 100;
            ApiService.updateProgress(widget.courseId!, 100).catchError((_) => null as dynamic);
          } else {
            final currentMilestone = (progress / 10).floor() * 10;
            if (currentMilestone > _lastReportedProgress) {
              _lastReportedProgress = currentMilestone;
              ApiService.updateProgress(widget.courseId!, currentMilestone).catchError((_) => null as dynamic);
            }
          }
        }
      });

      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) setState(() => _error = 'Video load नहीं हो पाया');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
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
            ? Text(_error!, style: const TextStyle(color: Colors.white))
            : _chewieController != null && _chewieController!.videoPlayerController.value.isInitialized
                ? Chewie(controller: _chewieController!)
                : const CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}
