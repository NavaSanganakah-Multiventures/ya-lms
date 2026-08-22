import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';

class MiniPlayerWidget extends StatelessWidget {
  final VoidCallback onOpenFullScreen;
  final VoidCallback onClose;
  final VoidCallback onToggleMic;
  final String title;
  final bool micEnabled;

  const MiniPlayerWidget({
    super.key,
    required this.onOpenFullScreen,
    required this.onClose,
    required this.onToggleMic,
    required this.title,
    required this.micEnabled,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 12,
      right: 12,
      bottom: isMobile(context) ? 72 : (isTablet(context) ? 80 : 88), // above bottom nav
      child: GestureDetector(
        onTap: onOpenFullScreen,
        child: Container(
          height: isMobile(context) ? 90 : (isTablet(context) ? 100 : 110),
          decoration: BoxDecoration(
            color: Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.primaryLight.withAlpha(80)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(80),
                blurRadius: 16,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Video placeholder / live indicator
              Container(
                width: isMobile(context) ? 90 : (isTablet(context) ? 100 : 120),
                decoration: BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.horizontal(left: Radius.circular(16)),
                ),
                child: Center(
                  child: Icon(
                    Icons.videocam_rounded,
                    color: Colors.white54,
                    size: 32,
                  ),
                ),
              ),
              SizedBox(width: 12),
              // Title + status
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Colors.greenAccent,
                            shape: BoxShape.circle,
                          ),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Live',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Mic toggle
              IconButton(
                icon: Icon(
                  micEnabled ? Icons.mic_rounded : Icons.mic_off_rounded,
                  color: micEnabled ? AppTheme.primaryLight : AppTheme.danger,
                ),
                onPressed: onToggleMic,
                tooltip: micEnabled ? 'Mute Mic' : 'Unmute Mic',
              ),
              // Close / leave
              IconButton(
                icon: Icon(Icons.close, color: Colors.white54),
                onPressed: onClose,
                tooltip: 'Leave Class',
              ),
              SizedBox(width: 4),
            ],
          ),
        ),
      ),
    );
  }
}
