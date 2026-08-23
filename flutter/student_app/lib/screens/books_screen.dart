import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';

class BooksScreen extends StatefulWidget {
  BooksScreen({super.key});

  @override
  State<BooksScreen> createState() => _BooksScreenState();
}

class _BooksScreenState extends State<BooksScreen> {
  List<dynamic> _books = [];
  List<dynamic> _filteredBooks = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  String _filter = 'all';

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
        final rawBooks = ApiUtils.extractList(data, 'books');
        _books = rawBooks.whereType<Map<String, dynamic>>().toList();
        _applyFilter();
        setState(() => _isLoading = false);
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

  void _applyFilter() {
    _filteredBooks = _books.where((b) {
      final book = b as Map<String, dynamic>;
      final title = (book['title'] ?? '').toString().toLowerCase();
      final author = (book['author'] ?? '').toString().toLowerCase();
      final matchesSearch = title.contains(_searchQuery) || author.contains(_searchQuery);
      final price = num.tryParse((book['price_rupees'] ?? '0').toString()) ?? 0;
      final matchesFilter = switch (_filter) {
        'free' => price == 0,
        'paid' => price > 0,
        _ => true,
      };
      return matchesSearch && matchesFilter;
    }).toList();
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query.trim().toLowerCase();
      _applyFilter();
    });
  }

  void _onFilterChanged(String? filter) {
    setState(() {
      _filter = filter ?? 'all';
      _applyFilter();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.backgroundOf(context),
      child: SafeArea(
        child: ResponsiveLayout(
          child: RefreshIndicator(
            color: AppTheme.primary,
            backgroundColor: AppTheme.surfaceOf(context),
            onRefresh: _fetchBooks,
            child: _isLoading
                ? _BooksLoading()
                : _error != null
                    ? _BooksError(message: _error!, onRetry: _fetchBooks)
                    : CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Library',
                                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                          color: AppTheme.textPrimaryOf(context),
                                          fontSize: 28,
                                        ),
                                  ),
                                  const SizedBox(height: AppTheme.space1),
                                  Text(
                                    'Books and study materials in one place',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: AppTheme.textSecondaryOf(context),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
                              child: YuvaInput(
                                hint: 'Search books or authors...',
                                prefixIcon: Icons.search_rounded,
                                suffixIcon: _searchQuery.isNotEmpty ? Icons.close_rounded : null,
                                onSuffixTap: () => _onSearch(''),
                                onChanged: _onSearch,
                              ),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space3)),
                          SliverToBoxAdapter(
                            child: YuvaChipFilter(
                              categories: const ['Free', 'Paid'],
                              selected: _filter == 'all' ? null : _filter.capitalize(),
                              onSelected: (val) => _onFilterChanged(val?.toLowerCase()),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space4)),
                          if (_filteredBooks.isEmpty)
                            SliverFillRemaining(
                              hasScrollBody: false,
                              child: Center(
                                child: YuvaEmptyState.noData(
                                  title: 'No books found',
                                  subtitle: 'Try a different search or filter.',
                                ),
                              ),
                            )
                          else
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space6),
                              sliver: SliverList.separated(
                                itemCount: _filteredBooks.length,
                                separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space3),
                                itemBuilder: (context, index) => BookCard(
                                  book: _filteredBooks[index] as Map<String, dynamic>,
                                  index: index,
                                ),
                              ),
                            ),
                        ],
                      ),
          ),
        ),
      ),
    );
  }
}

extension _StringX on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}

class _BooksLoading extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          YuvaShimmerCard(height: 48, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 36, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          ...List.generate(4, (_) => YuvaShimmerCard(height: 130)),
        ],
      ),
    );
  }
}

class _BooksError extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _BooksError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space6),
      children: [
        const SizedBox(height: 80),
        YuvaEmptyState.error(
          title: message,
          actionLabel: 'Try Again',
          onAction: onRetry,
        ),
      ],
    );
  }
}