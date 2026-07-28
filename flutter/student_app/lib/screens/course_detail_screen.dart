import 'package:flutter/material.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';
import '../utils/class_helper.dart';
import '../utils/responsive.dart';
import '../widgets/course_image.dart';
import 'pdf_viewer_screen.dart';
import 'quiz_active_screen.dart';

class CourseDetailScreen extends StatefulWidget {
 final Map<String, dynamic> course;
 final bool isEnrolled;

 CourseDetailScreen({
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

 @override
 void initState() {
 super.initState();
 _isEnrolledLocal = widget.isEnrolled;
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
 _lessons = List<dynamic>.from(
 lessonsResponse.data['lessons'] ?? [],
 );
 }
 if (liveResponse.statusCode == 200) {
 _liveSessions = List<dynamic>.from(
 liveResponse.data['sessions'] ?? [],
 );
 }
 _isLoading = false;
 });
 } catch (e) {
 debugPrint('Course detail fetch failed: $e');
 if (mounted) setState(() => _isLoading = false);
 }
 }

 void _openVideoPlayer(String videoUrl, String? lessonId) {
 final url = videoUrl.trim();
 if (url.isEmpty) {
 ScaffoldMessenger.of(
 context,
 ).showSnackBar( SnackBar(content: Text('Video URL missing है')));
 return;
 }
 if (lessonId == null || lessonId.isEmpty || lessonId == 'null') {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Lesson ID missing है, progress track nahi hoga'),
 ),
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

 @override
 Widget build(BuildContext context) {
 final courseTitle = widget.course['title'] ?? 'Course Details';
 return Scaffold(
 extendBodyBehindAppBar: true,
 appBar: AppBar(
 title: Text(
 courseTitle.toString(),
 maxLines: 1,
 overflow: TextOverflow.ellipsis,
 ),
 ),
 body: DecoratedBox(
 decoration: BoxDecoration(
 gradient: RadialGradient(
 center: Alignment.topLeft,
 radius: 1.2,
 colors: [AppTheme.moccasinLightOf(context), AppTheme.backgroundOf(context)],
 ),
 ),
 child: SafeArea(
 child: ResponsiveLayout(
 child: RefreshIndicator(
 color: AppTheme.primary,
 backgroundColor: AppTheme.elevatedOf(context),
 onRefresh: _fetchCourseContent,
 child: _isLoading
 ? Center(
 child: CircularProgressIndicator(color: AppTheme.primary),
 )
 : ListView(
 padding: EdgeInsets.fromLTRB(16, 8, 16, 28),
 children: [
 _CourseHero(course: widget.course),
 if (!_isEnrolledLocal &&
 ((widget.course['price_rupees'] is int
 ? widget.course['price_rupees'] as int
 : num.tryParse(widget.course['price_rupees']?.toString() ?? '')?.toInt()) ??
 (widget.course['price'] is int
 ? widget.course['price'] as int
 : num.tryParse(widget.course['price']?.toString() ?? '')?.toInt()) ??
 0) >
 0) ...[
 SizedBox(height: 16),
 Container(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(22),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 mainAxisAlignment: MainAxisAlignment.spaceBetween,
 children: [
 Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 'Premium Access',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 ),
 ),
 SizedBox(height: 4),
 Text(
 '₹${(num.tryParse((widget.course['price_rupees'] ?? widget.course['price']).toString()) ?? 0).toStringAsFixed(2)}',
 style: TextStyle(
 color: AppTheme.success,
 fontSize: 22,
 fontWeight: FontWeight.w900,
 ),
 ),
 ],
 ),
 ElevatedButton(
 onPressed: () {
 Navigator.push(
 context,
 MaterialPageRoute(
 builder: (_) => CheckoutScreen(
 item: widget.course,
 itemType: 'course',
 amountInr:
 widget.course['price_rupees'] ??
 widget.course['price'] ??
 0,
 ),
 ),
 ).then((success) {
 if (success == true) {
 setState(() => _isEnrolledLocal = true);
 _fetchCourseContent();
 }
 });
 },
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 padding: EdgeInsets.symmetric(
 horizontal: 24,
 vertical: 12,
 ),
 ),
 child: Text(
 'Buy Now',
 style: TextStyle(fontSize: 16),
 ),
 ),
 ],
 ),
 ),
 ],
 SizedBox(height: 22),
 _LiveSessionsList(
 sessions: _liveSessions,
 onJoin: (session) => ClassHelper.joinLiveClass(context, session, defaultTitle: widget.course['title']?.toString()),
 ),
 SizedBox(height: 22),
 Text(
 'Lessons',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 12),
 if (_lessons.isEmpty)
 _EmptyPanel(message: 'No lessons found')
 else
 ..._lessons.map(
 (lesson) => Padding(
 padding: EdgeInsets.only(bottom: 12),
 child: _LessonTile(
 lesson: Map<String, dynamic>.from(lesson),
 onTap: () {
 final lessonMap = Map<String, dynamic>.from(
 lesson as Map,
 );

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

 if ((lessonMap['type'] == 'video' ||
 lessonMap['type'] == 'recording') &&
 lessonMap['content_url'] != null &&
 lessonMap['content_url']
 .toString()
 .trim()
 .isNotEmpty) {
 var videoUrl = lessonMap['content_url']
 .toString();
 if (!videoUrl.startsWith('http')) {
 videoUrl = videoUrl.startsWith('/')
 ? '${ApiService.baseUrl}$videoUrl'
 : '${ApiService.baseUrl}/$videoUrl';
 }
 _openVideoPlayer(
 videoUrl,
 lessonMap['id']?.toString(),
 );
 } else if (lessonMap['type'] == 'live') {
 final matchingSession = _liveSessions
 .whereType<Map<String, dynamic>>()
 .firstWhere(
 (session) =>
 session['title'] ==
 lessonMap['title'],
 orElse: () => (_liveSessions.isNotEmpty
 ? Map<String, dynamic>.from(
 _liveSessions.first as Map,
 )
 : <String, dynamic>{}),
 );
 ClassHelper.joinLiveClass(context, {
 ...matchingSession,
 'title': lessonMap['title'],
 'course_id': widget.course['id'],
 });
 } else if (lessonMap['type'] == 'quiz') {
 if (lessonMap['exam_id'] == null) {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text('No quiz linked to this lesson.')),
 );
 return;
 }
 Navigator.push(
 context,
 MaterialPageRoute(builder: (_) => QuizActiveScreen(quiz: {
 'id': lessonMap['exam_id'],
 'title': lessonMap['title']
 })),
 ).then((_) {
 _fetchCourseContent();
 });
 } else if (lessonMap['type'] == 'audio' && lessonMap['content_url'] != null) {
 var audioUrl = lessonMap['content_url'].toString();
 if (!audioUrl.startsWith('http')) {
 audioUrl = audioUrl.startsWith('/') ? '${ApiService.baseUrl}$audioUrl' : '${ApiService.baseUrl}/$audioUrl';
 }
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text('Audio player coming soon')),
 );
 } else if (lessonMap['type'] == 'pdf' && lessonMap['content_url'] != null) {
 var pdfUrl = lessonMap['content_url'].toString();
 if (!pdfUrl.startsWith('http')) {
 pdfUrl = pdfUrl.startsWith('/') ? '${ApiService.baseUrl}$pdfUrl' : '${ApiService.baseUrl}/$pdfUrl';
 }
 Navigator.push(
 context,
 MaterialPageRoute(builder: (_) => PdfViewerScreen(pdfUrl: pdfUrl, title: lessonMap['title']?.toString() ?? 'PDF Lesson')),
 );
 } else {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text(
 'App preview में अभी video/live lessons supported हैं',
 ),
 ),
 );
 }
 },
 ),
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

 _CourseHero({required this.course});

 @override
 Widget build(BuildContext context) {
 return Container(
 padding: EdgeInsets.all(22),
 decoration: BoxDecoration(
 gradient: AppTheme.auroraGradient,
 borderRadius: BorderRadius.circular(30),
 border: Border.all(color: Color(0x44FFFFFF)),
 boxShadow: [
 BoxShadow(
 color: Color(0x4432115F),
 blurRadius: 28,
 offset: Offset(0, 16),
 ),
 ],
 ),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 CourseImage(
 course: course,
 width: 72,
 height: 72,
 borderRadius: 20,
 ),
 SizedBox(height: 14),
 Text(
 (course['title'] ?? 'Course').toString(),
 style: TextStyle(
 color: Colors.white,
 fontSize: 26,
 fontWeight: FontWeight.w900,
 letterSpacing: -0.7,
 ),
 ),
 SizedBox(height: 8),
 Text(
 (course['description'] ?? 'Learn with Adityanveshan.').toString(),
 style: TextStyle(color: Colors.white70, height: 1.5),
 maxLines: 4,
 overflow: TextOverflow.ellipsis,
 ),
 ],
 ),
 );
 }
}

class _LiveSessionsList extends StatelessWidget {
 final List<dynamic> sessions;
 final void Function(Map<String, dynamic> session) onJoin;

 _LiveSessionsList({required this.sessions, required this.onJoin});

 @override
 Widget build(BuildContext context) {
 return Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 'Live Classes',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 12),
 if (sessions.isEmpty)
 _EmptyPanel(message: 'इस course में कोई live class नहीं है')
 else
 ...sessions.map((session) {
 final item = Map<String, dynamic>.from(session);
 final status = (item['status'] ?? 'scheduled').toString();
 return Padding(
 padding: EdgeInsets.only(bottom: 12),
 child: Container(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(22),
 border: Border.all(
 color: status == 'live'
 ? Color(0x66DC2626)
 : AppTheme.borderOf(context),
 ),
 ),
 child: Row(
 children: [
 Icon(
 status == 'live'
 ? Icons.fiber_manual_record
 : Icons.videocam_outlined,
 color: status == 'live'
 ? AppTheme.danger
 : AppTheme.primaryLight,
 ),
 SizedBox(width: 12),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 item['title'] ?? 'Live Class',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.w900,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 4),
 Text(
 status.toUpperCase(),
 style: TextStyle(
 color: AppTheme.mutedOf(context),
 fontSize: 11,
 fontWeight: FontWeight.w700,
 ),
 ),
 ],
 ),
 ),
 TextButton.icon(
 onPressed: status == 'live' || status == 'scheduled' || status == 'upcoming' ? () => onJoin(item) : null,
 icon: Icon(Icons.play_arrow_rounded),
 label: Text('Join'),
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

 _LessonTile({required this.lesson, required this.onTap});

 @override
 Widget build(BuildContext context) {
 final type = (lesson['type'] ?? '').toString();
 final isLocked = lesson['is_locked'] == true;
 final icon = switch (type) {
 'video' => Icons.play_circle_outline_rounded,
 'recording' => Icons.video_library_outlined,
 'live' => Icons.live_tv_rounded,
 'pdf' => Icons.picture_as_pdf_outlined,
 'audio' => Icons.audiotrack_outlined,
 'quiz' => Icons.quiz_outlined,
 _ => Icons.insert_drive_file_outlined,
 };

 return InkWell(
 borderRadius: BorderRadius.circular(22),
 onTap: onTap,
 child: Ink(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(22),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 children: [
 Icon(
 icon,
 color: isLocked ? AppTheme.mutedOf(context) : AppTheme.primaryLight,
 ),
 SizedBox(width: 14),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 lesson['title'] ?? 'Untitled Lesson',
 style: TextStyle(
 color: isLocked ? AppTheme.textSecondaryOf(context) : AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.w800,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 4),
 Text(
 type.toUpperCase(),
 style: TextStyle(
 color: AppTheme.mutedOf(context),
 fontSize: 11,
 fontWeight: FontWeight.w700,
 ),
 ),
 ],
 ),
 ),
 Icon(
 isLocked ? Icons.lock_outline : Icons.chevron_right_rounded,
 color: isLocked ? Colors.redAccent : AppTheme.mutedOf(context),
 ),
 ],
 ),
 ),
 );
 }
}

class _EmptyPanel extends StatelessWidget {
 final String message;

 _EmptyPanel({required this.message});

 @override
 Widget build(BuildContext context) {
 return Container(
 width: double.infinity,
 padding: EdgeInsets.all(18),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(22),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Text(
 message,
 textAlign: TextAlign.center,
 style: TextStyle(color: AppTheme.mutedOf(context)),
 ),
 );
 }
}

class VideoPlayerScreen extends StatefulWidget {
 final String videoUrl;
 final String? courseId;
 final String? lessonId;

 VideoPlayerScreen({
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
 if (state == AppLifecycleState.inactive ||
 state == AppLifecycleState.paused) {
 _enterPictureInPicture();
 }
 }

 Future<void> _initializePlayer() async {
 try {
 final headers = await ApiService.getHeaders();
 final controller = VideoPlayerController.networkUrl(
 Uri.parse(widget.videoUrl),
 httpHeaders: headers,
 videoPlayerOptions: VideoPlayerOptions(allowBackgroundPlayback: false),
 );
 _videoPlayerController = controller;
 
 _chewieController = ChewieController(
 videoPlayerController: controller,
 autoPlay: true,
 looping: false,
 autoInitialize: true,
 showControlsOnInitialize: false,
 placeholder: Center(
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
 if (duration > 0 &&
 widget.courseId != null &&
 widget.lessonId != null) {
 final progress = ((position / duration) * 100).toInt();
 int targetProgress = 0;
 if (progress >= 100) { targetProgress = 100; }
 else if (progress >= 75) { targetProgress = 75; }
 else if (progress >= 50) { targetProgress = 50; }
 else if (progress >= 25) { targetProgress = 25; }
 
 if (targetProgress > _lastReportedProgress) {
 _lastReportedProgress = targetProgress;
 ApiService.completeLesson(
 widget.courseId!,
 widget.lessonId!,
 position,
 ).then((_) {}, onError: (_) {});
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
 icon: Icon(Icons.picture_in_picture_alt),
 ),
 ],
 ),
 body: Center(
 child: _error != null
 ? Text(_error!, style: TextStyle(color: AppTheme.textPrimaryOf(context)))
 : _chewieController != null
 ? Chewie(controller: _chewieController!)
 : CircularProgressIndicator(color: AppTheme.primary),
 ),
 );
 }
}