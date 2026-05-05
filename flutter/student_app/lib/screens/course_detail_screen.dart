import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import 'dart:convert';

class CourseDetailScreen extends StatefulWidget {
  final Map<String, dynamic> course;

  CourseDetailScreen({required this.course});

  @override
  _CourseDetailScreenState createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  List<dynamic> _lessons = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchLessons();
  }

  Future<void> _fetchLessons() async {
    try {
      final response = await ApiService.getCourseLessons(widget.course['id'].toString());
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _lessons = data['lessons'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _openVideoPlayer(String videoUrl) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VideoPlayerScreen(videoUrl: videoUrl),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.course['title'] ?? 'Course Details')),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _lessons.isEmpty
              ? Center(child: Text('No lessons found'))
              : ListView.builder(
                  itemCount: _lessons.length,
                  itemBuilder: (context, index) {
                    final lesson = _lessons[index];
                    return ListTile(
                      leading: Icon(
                        lesson['type'] == 'video' ? Icons.play_circle : Icons.insert_drive_file,
                      ),
                      title: Text(lesson['title'] ?? 'Untitled Lesson'),
                      subtitle: Text(lesson['type'] ?? ''),
                      onTap: () {
                        if (lesson['type'] == 'video' && lesson['content_url'] != null) {
                          // Note: In reality, content_url from R2 might need to be resolved to a full public URL
                          // depending on how Next.js backend handles R2 file URLs.
                          String videoUrl = lesson['content_url'];
                          if (!videoUrl.startsWith('http')) {
                            // Example format, adapt based on how backend provides R2 URLs
                            videoUrl = '${ApiService.baseUrl}/api/courses/${widget.course['id']}/lessons/${lesson['id']}/download';
                          }
                          _openVideoPlayer(videoUrl);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Only video lessons supported in app preview')),
                          );
                        }
                      },
                    );
                  },
                ),
    );
  }
}

class VideoPlayerScreen extends StatefulWidget {
  final String videoUrl;

  VideoPlayerScreen({required this.videoUrl});

  @override
  _VideoPlayerScreenState createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    await _videoPlayerController.initialize();
    _chewieController = ChewieController(
      videoPlayerController: _videoPlayerController,
      autoPlay: true,
      looping: false,
    );
    setState(() {});
  }

  @override
  void dispose() {
    _videoPlayerController.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: _chewieController != null &&
                _chewieController!.videoPlayerController.value.isInitialized
            ? Chewie(controller: _chewieController!)
            : CircularProgressIndicator(),
      ),
    );
  }
}
