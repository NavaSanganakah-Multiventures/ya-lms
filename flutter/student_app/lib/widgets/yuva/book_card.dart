import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class BookCard extends StatelessWidget {
  final Map<String, dynamic> book;
  final int index;

  const BookCard({super.key, required this.book, this.index = 0});

  @override
  Widget build(BuildContext context) {
    final title = (book['title'] ?? 'Book Title').toString();
    final author = (book['author'] ?? 'Author').toString();
    final description = (book['description'] ?? 'No description available').toString();
    final price = num.tryParse((book['price_rupees'] ?? '0').toString()) ?? 0;

    return YuvaCard(
      onTap: () => _openBook(context),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 76,
            height: 100,
            decoration: BoxDecoration(
              gradient: AppTheme.auroraGradient,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              boxShadow: AppTheme.softShadow,
            ),
            child: const Icon(Icons.menu_book_rounded, color: AppTheme.surface, size: 36),
          ),
          const SizedBox(width: AppTheme.space4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 16,
                      ),
                ),
                const SizedBox(height: AppTheme.space1),
                Text(
                  author,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.mutedOf(context),
                        fontWeight: FontWeight.w600,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space2),
                Text(
                  description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textTertiaryOf(context),
                        height: 1.4,
                      ),
                ),
                const SizedBox(height: AppTheme.space3),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '₹${price.toStringAsFixed(2)}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppTheme.success,
                            fontSize: 16,
                          ),
                    ),
                    YuvaButton.secondary(
                      label: 'View',
                      onPressed: () => _openBook(context),
                      height: 34,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    )
        .animate(delay: (index * 50).ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms);
  }

  void _openBook(BuildContext context) {
    var fileUrl = (book['content_url'] ?? book['file_url'] ?? '').toString().trim();
    if (fileUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('इस Book के लिए अभी content उपलब्ध नहीं है')),
      );
      return;
    }
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      fileUrl = fileUrl.startsWith('/')
          ? '${ApiService.baseUrl}$fileUrl'
          : '${ApiService.baseUrl}/$fileUrl';
    }
    Navigator.pushNamed(context, '/pdf', arguments: {
      'pdfUrl': fileUrl,
      'title': book['title']?.toString() ?? 'Book',
    });
  }
}