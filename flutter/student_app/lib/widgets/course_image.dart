import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'app_shimmer.dart';

class CourseImage extends StatelessWidget {
 final Map<String, dynamic> course;
 final double? width;
 final double? height;
 final double borderRadius;
 final BoxFit fit;
 final Gradient? fallbackGradient;

 CourseImage({
 super.key,
 required this.course,
 this.width,
 this.height,
 this.borderRadius = 20,
 this.fit = BoxFit.cover,
 this.fallbackGradient,
 });

 static String? _pickImageUrl(Map<String, dynamic> data) {
 for (final key in [
 'image_url',
 'thumbnail_url',
 'cover_url',
 'image',
 'thumbnail',
 'cover',
 ]) {
 final raw = data[key];
 if (raw != null) {
 final url = raw.toString().trim();
 if (url.isNotEmpty && url != 'null') return url;
 }
 }
 return null;
 }

 static String? resolveUrl(String? raw) {
 if (raw == null || raw.trim().isEmpty) return null;
 if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
 final base = ApiService.baseUrl;
 if (raw.startsWith('/')) return '$base$raw';
 return '$base/$raw';
 }

 @override
 Widget build(BuildContext context) {
 final raw = _pickImageUrl(course);
 final url = resolveUrl(raw);

 return ClipRRect(
 borderRadius: BorderRadius.circular(borderRadius),
 child: Container(
 width: width,
 height: height,
 decoration: BoxDecoration(
 gradient: fallbackGradient ??
 LinearGradient(
 colors: [
 AppTheme.primary.withAlphaOpacity(0.25),
 AppTheme.secondary.withAlphaOpacity(0.15),
 ],
 begin: Alignment.topLeft,
 end: Alignment.bottomRight,
 ),
 ),
 child: url != null
 ? CachedNetworkImage(
 imageUrl: url,
 fit: fit,
 width: width,
 height: height,
 placeholder: (context, __) => AppShimmer(
 child: ColoredBox(color: AppTheme.surfaceOf(context)),
 ),
 errorWidget: (_, __, ___) => _FallbackContent(course: course),
 )
 : _FallbackContent(course: course),
 ),
 );
 }
}

class _FallbackContent extends StatelessWidget {
 final Map<String, dynamic> course;
 _FallbackContent({required this.course});

 @override
 Widget build(BuildContext context) {
 return Center(
 child: Icon(
 Icons.auto_stories_rounded,
 color: AppTheme.primary.withAlphaOpacity(0.6),
 size: 32,
 ),
 );
 }
}
