import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../theme/app_theme.dart';

class ChatBubble extends StatelessWidget {
  final String content;
  final bool isUser;
  final bool isLoading;

  const ChatBubble({
    super.key,
    required this.content,
    this.isUser = false,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppTheme.space3),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space3),
        decoration: BoxDecoration(
          gradient: isUser ? AppTheme.premiumGradient : null,
          color: isUser ? null : AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppTheme.radiusLg),
            topRight: const Radius.circular(AppTheme.radiusLg),
            bottomLeft: Radius.circular(isUser ? AppTheme.radiusLg : 4),
            bottomRight: Radius.circular(isUser ? 4 : AppTheme.radiusLg),
          ),
          boxShadow: AppTheme.softShadow,
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        child: isLoading
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  ),
                  const SizedBox(width: AppTheme.space2),
                  Text(
                    'Yagya Mitra soch raha hai...',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.textSecondaryOf(context),
                        ),
                  ),
                ],
              )
            : MarkdownBody(
                data: content,
                styleSheet: MarkdownStyleSheet(
                  p: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: isUser ? AppTheme.surface : AppTheme.textPrimaryOf(context),
                        height: 1.5,
                      ) ??
                      const TextStyle(),
                  code: TextStyle(
                    color: isUser ? AppTheme.surface.withAlphaOpacity(0.85) : AppTheme.accent,
                    fontSize: 13,
                    backgroundColor:
                        isUser ? AppTheme.surface.withAlphaOpacity(0.2) : AppTheme.elevatedOf(context),
                  ),
                  strong: TextStyle(
                    color: isUser ? AppTheme.surface : AppTheme.textPrimaryOf(context),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
      ),
    );
  }
}