import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import '../utils/responsive.dart';
import '../widgets/app_shimmer.dart';
import 'pdf_viewer_screen.dart';

class BooksScreen extends StatefulWidget {
 const BooksScreen({super.key});

 @override
 State<BooksScreen> createState() => _BooksScreenState();
}

class _BooksScreenState extends State<BooksScreen> {
 List<dynamic> _books = [];
 bool _isLoading = true;
 String? _error;

 @override
 void initState() {
 super.initState();
 _fetchBooks();
 }

 Future<void> _fetchBooks() async {
 setState(() {
 _isLoading = true;
 _error = null;
 });

 try {
 final response = await ApiService.getBooks();
 if (!mounted) return;
 if (response.statusCode == 200) {
 final data = response.data;
 setState(() {
 final rawBooks = ApiUtils.extractList(data, 'books');
  _books = rawBooks.whereType<Map<String, dynamic>>().toList();
 _isLoading = false;
 });
 } else {
 setState(() {
 _error = 'Books load नहीं हो पाए (${response.statusCode})';
 _isLoading = false;
 });
 }
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _error = 'Network Error: Internet connection check करें';
 _isLoading = false;
 });
 }
 }

 @override
 Widget build(BuildContext context) {
 return DecoratedBox(
 decoration: BoxDecoration(
 gradient: RadialGradient(
 center: Alignment.topRight,
 radius: 1.15,
 colors: [AppTheme.moccasinLightOf(context), AppTheme.backgroundOf(context)],
 ),
 ),
 child: SafeArea(
 child: ResponsiveLayout(
 child: RefreshIndicator(
 color: AppTheme.primary,
 backgroundColor: AppTheme.elevatedOf(context),
 onRefresh: _fetchBooks,
 child: LayoutBuilder(
 builder: (context, constraints) {
 return _isLoading
 ? SingleChildScrollView(
 physics: AlwaysScrollableScrollPhysics(),
 child: SizedBox(
 height: constraints.maxHeight,
 child: _LoadingState(),
 ),
 )
 : _error != null
 ? SingleChildScrollView(
 physics: AlwaysScrollableScrollPhysics(),
 child: SizedBox(
 height: constraints.maxHeight,
 child: _ErrorState(message: _error!, onRetry: _fetchBooks),
 ),
 )
 : _books.isEmpty
 ? SingleChildScrollView(
 physics: AlwaysScrollableScrollPhysics(),
 child: SizedBox(
 height: constraints.maxHeight,
 child: _EmptyState(),
 ),
 )
 : ListView.separated(
 padding: EdgeInsets.all(16),
 itemCount: _books.length,
 separatorBuilder: (_, __) => SizedBox(height: 14),
 itemBuilder: (context, index) {
 final book = _books[index];
 return _BookCard(book: book);
 },
 );
 },
 ),
 ),
 ),
 ),
 );
 }
}

class _BookCard extends StatelessWidget {
 final dynamic book;

 const _BookCard({required this.book});

 @override
 Widget build(BuildContext context) {
 return Container(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(28),
 border: Border.all(color: AppTheme.borderOf(context).withAlpha(60)),
 ),
 child: Row(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Container(
 width: 72,
 height: 96,
 decoration: BoxDecoration(
 gradient: LinearGradient(colors: [AppTheme.primaryLight.withAlpha(76), Color(0x221E1B2E)]),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.primaryLight.withAlpha(92)),
 ),
 child: Icon(Icons.menu_book_rounded, color: AppTheme.primaryLight, size: 36),
 ),
 SizedBox(width: 16),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 (book['title'] ?? 'Book Title').toString(),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 style: TextStyle(color: AppTheme.textPrimaryOf(context), fontWeight: FontWeight.w900, fontSize: 18),
 ),
 SizedBox(height: 6),
 Text(
 (book['author'] ?? 'Author').toString(),
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 14, fontWeight: FontWeight.w600),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 8),
 Text(
 (book['description'] ?? 'No description available').toString(),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 style: TextStyle(color: AppTheme.mutedSoftOf(context), fontSize: 12, height: 1.4),
 ),
 SizedBox(height: 12),
 Row(
 mainAxisAlignment: MainAxisAlignment.spaceBetween,
 children: [
 Text(
 '₹${(num.tryParse((book['price_rupees'] ?? '0').toString()) ?? 0).toStringAsFixed(2)}',
 style: TextStyle(color: AppTheme.secondaryLight, fontSize: 16, fontWeight: FontWeight.w800),
 ),
 ElevatedButton(
 style: ElevatedButton.styleFrom(
 padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
 minimumSize: Size.zero,
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
 ),
 onPressed: () {
 // If book has a PDF/content URL, open in PDF viewer
 final fileUrl = (book['content_url'] ?? book['file_url'] ?? '').toString();
 if (fileUrl.isNotEmpty && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
 Navigator.push(
 context,
 MaterialPageRoute(
 builder: (_) => PdfViewerScreen(
 pdfUrl: fileUrl,
 title: book['title']?.toString() ?? 'Book',
 ),
 ),
 );
 } else {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text('Book details coming soon')),
 );
 }
 },
 child: Text('View'),
 ),
 ],
 ),
 ],
 ),
 ),
 ],
 ),
 );
 }
}

class _LoadingState extends StatelessWidget {
 const _LoadingState();

 @override
 Widget build(BuildContext context) {
 return Padding(
 padding: EdgeInsets.all(16),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 ShimmerCard(height: 140),
 SizedBox(height: 16),
 ...List.generate(4, (_) => ShimmerCard(height: 100)),
 ],
 ),
 );
 }
}

class _ErrorState extends StatelessWidget {
 final String message;
 final VoidCallback onRetry;

 const _ErrorState({required this.message, required this.onRetry});

 @override
 Widget build(BuildContext context) {
 return Center(
 child: Padding(
 padding: EdgeInsets.all(24),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.error_outline_rounded, color: AppTheme.danger, size: 52),
 SizedBox(height: 16),
 Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 18, fontWeight: FontWeight.w800)),
 SizedBox(height: 18),
 ElevatedButton(onPressed: onRetry, child: Text('RETRY')),
 ],
 ),
 ),
 );
 }
}

class _EmptyState extends StatelessWidget {
 const _EmptyState();

 @override
 Widget build(BuildContext context) {
 return Center(
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.library_books_rounded, color: AppTheme.mutedOf(context), size: 64),
 SizedBox(height: 16),
 Text('अभी कोई Books उपलब्ध नहीं हैं', style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 16)),
 ],
 ),
 );
 }
}