import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../course_image.dart';

class DashboardHeader extends StatelessWidget {
  final VoidCallback? onNotificationTap;
  final VoidCallback? onAvatarTap;

  const DashboardHeader({
    super.key,
    this.onNotificationTap,
    this.onAvatarTap,
  });

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
    final avatarUrl = _pickAvatarUrl(user);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space2),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Namaste,',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textSecondaryOf(context),
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  _firstName(name),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 24,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          _HeaderIconButton(
            icon: Icons.notifications_outlined,
            onTap: onNotificationTap,
          ),
          const SizedBox(width: AppTheme.space2 + 4),
          GestureDetector(
            onTap: onAvatarTap,
            child: Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                gradient: AppTheme.auroraGradient,
                shape: BoxShape.circle,
                boxShadow: AppTheme.softShadow,
              ),
              clipBehavior: Clip.antiAlias,
              child: _AvatarContent(url: avatarUrl, name: name),
            ),
          ),
        ],
      ),
    );
  }

  String _firstName(String name) => name.split(' ').first;

  String? _pickAvatarUrl(Map<String, dynamic>? user) {
    if (user == null) return null;
    for (final key in ['avatar_url', 'profile_image', 'image_url', 'photo_url']) {
      final raw = user[key];
      if (raw != null) {
        final url = raw.toString().trim();
        if (url.isNotEmpty && url != 'null') return url;
      }
    }
    return null;
  }
}

class _AvatarContent extends StatelessWidget {
  final String? url;
  final String name;

  const _AvatarContent({this.url, required this.name});

  @override
  Widget build(BuildContext context) {
    if (url == null) return _FallbackAvatar(name: name);
    final resolved = CourseImage.resolveUrl(url);
    if (resolved == null) return _FallbackAvatar(name: name);
    return Image.network(
      resolved,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _FallbackAvatar(name: name),
    );
  }
}

class _FallbackAvatar extends StatelessWidget {
  final String name;
  const _FallbackAvatar({required this.name});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'S',
        style: const TextStyle(
          color: AppTheme.surface,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _HeaderIconButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.surfaceOf(context),
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            border: Border.all(color: AppTheme.borderOf(context)),
          ),
          child: Icon(icon, color: AppTheme.textPrimaryOf(context), size: 22),
        ),
      ),
    );
  }
}