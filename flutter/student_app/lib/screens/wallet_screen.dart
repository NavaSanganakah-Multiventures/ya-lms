import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';
import 'checkout_screen.dart';
import '../services/real_time_service.dart';

class WalletScreen extends StatefulWidget {
  WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  static String _cacheKey = 'wallet_cache';
  static String _cacheTimeKey = 'wallet_cache_time';
  static int _cacheTtlMs = 5 * 60 * 1000;

  Map<String, dynamic>? _balanceData;
  List<dynamic> _creditPacks = [];
  List<dynamic> _ledgerHistory = [];
  bool _isLoading = true;
  bool _isShowingCached = false;
  String? _error;

  String _selectedTab = 'recharge';
  double _customAmount = 101;
  late final TextEditingController _amountController;

  Map<String, dynamic> _pricing = {
    'ai_featured_pack_amount_rupees': '101',
    'ai_credit_deduction_per_request': '2',
  };

  StreamSubscription<Map<String, dynamic>>? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: _customAmount.round().toString());
    _fetchWalletData();
    _realtimeSub = RealTimeService.instance.dataStream.listen((event) async {
      if (!mounted) return;
      if (event['type'] == 'wallet') {
        final data = event['data'] as Map<String, dynamic>?;
        if (data != null && data.containsKey('balance_rupees')) {
          setState(() => _balanceData = data);
        }
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchWalletData({bool skipCache = false}) async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _isShowingCached = false;
    });

    if (!skipCache) {
      final cached = await _loadCachedWallet();
      if (cached != null && mounted) {
        _applyWalletData(cached);
        setState(() {
          _isLoading = false;
          _isShowingCached = true;
        });
      }
    }

    Map<String, dynamic>? balanceData;
    List<dynamic> creditPacks = [];
    Map<String, dynamic> settingsData = {};
    List<dynamic> ledgerData = [];

    Future<dynamic> safeCall(String label, Future<dynamic> Function() call) async {
      try {
        return await call();
      } catch (e) {
        debugPrint('Wallet: $label fetch failed: $e');
        return null;
      }
    }

    final results = await Future.wait([
      safeCall('balance', () => ApiService.getWalletBalance()),
      safeCall('packs', () => ApiService.getCreditPacks()),
      safeCall('settings', () => ApiService.getSettings()),
      safeCall('ledger', () => ApiService.getWalletLedger()),
    ]);

    final balanceResponse = results[0];
    final packsResponse = results[1];
    final settingsResponse = results[2];
    final ledgerResponse = results[3];

    if (balanceResponse != null && balanceResponse.statusCode == 200) {
      balanceData = balanceResponse.data;
    }

    if (packsResponse != null && packsResponse.statusCode == 200) {
      creditPacks = ApiUtils.extractList(packsResponse.data, 'packs')
          .where((pack) =>
              pack is Map &&
              (pack['is_active'] == 1 || pack['is_active'] == '1' || pack['is_active'] == true))
          .toList();
    }

    if (settingsResponse != null && settingsResponse.statusCode == 200) {
      settingsData = settingsResponse.data['settings'] ?? {};
    }

    if (ledgerResponse != null && ledgerResponse.statusCode == 200) {
      ledgerData = ledgerResponse.data['ledger'] ?? [];
    }

    if (!mounted) return;

    if (balanceData == null && creditPacks.isEmpty && ledgerData.isEmpty && !skipCache && _isShowingCached) {
      setState(() {
        _isLoading = false;
        _isShowingCached = false;
      });
      return;
    }

    final pricing = {
      'ai_featured_pack_amount_rupees':
          settingsData['ai_featured_pack_amount_rupees']?.toString() ?? '101',
      'ai_credit_deduction_per_request':
          settingsData['ai_credit_deduction_per_request']?.toString() ?? '2',
    };
    final customAmount = double.tryParse(pricing['ai_featured_pack_amount_rupees'] ?? '101') ?? 101;

    final payload = {
      'balanceData': balanceData,
      'pricing': pricing,
      'creditPacks': creditPacks,
      'ledgerHistory': ledgerData,
      'customAmount': customAmount,
    };

    await _cacheWallet(payload);

    setState(() {
      _applyWalletData(payload);
      _isLoading = false;
      _isShowingCached = false;
    });
  }

  Future<void> _refreshBalanceQuietly() async {
    try {
      final response = await ApiService.getWalletBalance();
      if (mounted && response.statusCode == 200) {
        setState(() => _balanceData = response.data);
      }
    } catch (e) {
      debugPrint('Wallet quiet refresh failed: $e');
    }
  }

  void _applyWalletData(Map<String, dynamic> data) {
    _balanceData = data['balanceData'] as Map<String, dynamic>?;
    _pricing = Map<String, dynamic>.from(data['pricing'] as Map? ?? {});
    _creditPacks = List<dynamic>.from(data['creditPacks'] as List? ?? []);
    _ledgerHistory = List<dynamic>.from(data['ledgerHistory'] as List? ?? []);
    _customAmount = (data['customAmount'] as num?)?.toDouble() ?? _customAmount;
    _amountController.text = _customAmount.round().toString();
  }

  Future<Map<String, dynamic>?> _loadCachedWallet() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt(_cacheTimeKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > _cacheTtlMs) return null;
      final json = prefs.getString(_cacheKey);
      if (json == null || json.isEmpty) return null;
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Wallet: cache load failed: $e');
      return null;
    }
  }

  Future<void> _cacheWallet(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(data));
      await prefs.setInt(_cacheTimeKey, DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('Wallet: cache save failed: $e');
    }
  }

  void _purchasePack(Map<String, dynamic> pack) {
    final amountInr = (pack['amount_rupees'] ?? 0) is int
        ? pack['amount_rupees']
        : num.tryParse(pack['amount_rupees'].toString())?.toInt() ?? 0;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CheckoutScreen(
          item: pack,
          itemType: 'credit_pack',
          amountInr: amountInr,
        ),
      ),
    ).then((success) {
      if (success == true && mounted) _fetchWalletData(skipCache: true);
    });
  }

  void _purchaseCustom() {
    final amount = _customAmount.round();
    if (amount <= 0) return;
    final item = {'title': 'Wallet Top-up'};
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CheckoutScreen(
          item: item,
          itemType: 'credit_pack',
          amountInr: amount,
        ),
      ),
    ).then((success) {
      if (success == true && mounted) _fetchWalletData(skipCache: true);
    });
  }

  void _setQuickAmount(double amount) {
    setState(() {
      _customAmount = amount;
      _amountController.text = amount.round().toString();
    });
  }

  void _onAmountChanged(String value) {
    setState(() => _customAmount = double.tryParse(value) ?? 0);
  }

  void _onTabChanged(String tab) {
    setState(() => _selectedTab = tab);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.backgroundOf(context),
      child: SafeArea(
        child: ResponsiveLayout(
          child: _isLoading
              ? _WalletLoading()
              : _error != null
                  ? _WalletError(message: _error!, onRetry: _fetchWalletData)
                  : RefreshIndicator(
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.surfaceOf(context),
                      onRefresh: () => _fetchWalletData(skipCache: true),
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, AppTheme.space4, AppTheme.space4, AppTheme.space3),
                              child: Text(
                                'Wallet',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      color: AppTheme.textPrimaryOf(context),
                                      fontSize: 28,
                                    ),
                              ),
                            ),
                          ),
                          SliverToBoxAdapter(child: BalanceCard(balanceData: _balanceData)),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
                          SliverToBoxAdapter(child: _TabBar(selectedTab: _selectedTab, onTabChanged: _onTabChanged)),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space4)),
                          if (_selectedTab == 'recharge')
                            SliverToBoxAdapter(
                              child: _RechargeTab(
                                amountController: _amountController,
                                customAmount: _customAmount,
                                pricing: _pricing,
                                onAmountChanged: _onAmountChanged,
                                onQuickAmount: _setQuickAmount,
                                onPay: _purchaseCustom,
                              ),
                            )
                          else if (_selectedTab == 'packs')
                            _buildPacksSection()
                          else if (_selectedTab == 'history')
                            _buildHistorySection(),
                          const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space6)),
                        ],
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _buildPacksSection() {
    if (_creditPacks.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: Center(
          child: YuvaEmptyState.noData(
            title: 'No packs available',
            subtitle: 'Custom recharge still available above.',
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      sliver: SliverList.separated(
        itemCount: _creditPacks.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space3),
        itemBuilder: (context, index) {
          final pack = _creditPacks[index] is Map<String, dynamic>
              ? _creditPacks[index] as Map<String, dynamic>
              : <String, dynamic>{};
          return CreditPackCard(
            pack: pack,
            onTap: () => _purchasePack(pack),
            index: index,
          );
        },
      ),
    );
  }

  Widget _buildHistorySection() {
    if (_ledgerHistory.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: Center(
          child: YuvaEmptyState.noData(
            title: 'No transactions yet',
            subtitle: 'Your wallet activity will appear here.',
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final item = _ledgerHistory[index] is Map<String, dynamic>
                ? _ledgerHistory[index] as Map<String, dynamic>
                : <String, dynamic>{};
            return TransactionRow(item: item, index: index);
          },
          childCount: _ledgerHistory.length,
        ),
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  final String selectedTab;
  final ValueChanged<String> onTabChanged;

  const _TabBar({required this.selectedTab, required this.onTabChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: Container(
        padding: const EdgeInsets.all(AppTheme.space1 + 4),
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          border: Border.all(color: AppTheme.borderOf(context)),
        ),
        child: Row(
          children: [
            _TabButton(label: 'Recharge', tab: 'recharge', selectedTab: selectedTab, onTap: onTabChanged),
            _TabButton(label: 'Packs', tab: 'packs', selectedTab: selectedTab, onTap: onTabChanged),
            _TabButton(label: 'History', tab: 'history', selectedTab: selectedTab, onTap: onTabChanged),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final String tab;
  final String selectedTab;
  final ValueChanged<String> onTap;

  const _TabButton({
    required this.label,
    required this.tab,
    required this.selectedTab,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selectedTab == tab;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(tab),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: AppTheme.space2 + 4),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: isSelected ? AppTheme.surface : AppTheme.textSecondaryOf(context),
                  fontSize: 13,
                ),
          ),
        ),
      ),
    );
  }
}

class _RechargeTab extends StatelessWidget {
  final TextEditingController amountController;
  final double customAmount;
  final Map<String, dynamic> pricing;
  final ValueChanged<String> onAmountChanged;
  final ValueChanged<double> onQuickAmount;
  final VoidCallback onPay;

  const _RechargeTab({
    required this.amountController,
    required this.customAmount,
    required this.pricing,
    required this.onAmountChanged,
    required this.onQuickAmount,
    required this.onPay,
  });

  @override
  Widget build(BuildContext context) {
    final deduction = pricing['ai_credit_deduction_per_request'] ?? '2';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: YuvaCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add Funds',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppTheme.textPrimaryOf(context),
                    fontSize: 22,
                  ),
            ),
            const SizedBox(height: AppTheme.space1),
            Text(
              '₹${(num.tryParse(deduction.toString()) ?? 0).toStringAsFixed(2)} deducted per AI request',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textTertiaryOf(context),
                  ),
            ),
            const SizedBox(height: AppTheme.space4),

            Wrap(
              spacing: AppTheme.space2 + 4,
              runSpacing: AppTheme.space2 + 4,
              children: [101.0, 251.0, 501.0, 1001.0].map((amount) {
                final selected = customAmount.round() == amount.round();
                return ChoiceChip(
                  label: Text('₹${amount.round()}'),
                  selected: selected,
                  onSelected: (_) => onQuickAmount(amount),
                  selectedColor: AppTheme.primary,
                  backgroundColor: AppTheme.elevatedOf(context),
                  labelStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: selected ? AppTheme.surface : AppTheme.textPrimaryOf(context),
                        fontSize: 13,
                      ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    side: BorderSide(
                      color: selected ? AppTheme.primary : AppTheme.borderOf(context),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppTheme.space4),

            Text(
              'Or enter custom amount',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: AppTheme.textPrimaryOf(context),
                    fontSize: 14,
                  ),
            ),
            const SizedBox(height: AppTheme.space2),
            TextFormField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: false),
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textPrimaryOf(context),
                    fontSize: 22,
                  ),
              onChanged: onAmountChanged,
              decoration: InputDecoration(
                hintText: 'Enter amount',
                prefixText: '₹ ',
                prefixStyle: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppTheme.primary,
                      fontSize: 22,
                    ),
              ),
            ),
            const SizedBox(height: AppTheme.space5),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.space4),
              decoration: BoxDecoration(
                color: AppTheme.elevatedOf(context),
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                border: Border.all(color: AppTheme.borderOf(context)),
              ),
              child: Column(
                children: [
                  Text(
                    'Amount to add',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.textSecondaryOf(context),
                        ),
                  ),
                  const SizedBox(height: AppTheme.space1),
                  Text(
                    '₹${customAmount.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          color: AppTheme.primary,
                          fontSize: 32,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space5),

            YuvaButton.primary(
              label: 'Pay ₹${customAmount.toStringAsFixed(2)}',
              onPressed: customAmount >= 10 ? onPay : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _WalletLoading extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          YuvaShimmerCard(height: 170, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 56, margin: EdgeInsets.only(bottom: AppTheme.space4)),
          YuvaShimmerCard(height: 260, margin: EdgeInsets.only(bottom: AppTheme.space4)),
        ],
      ),
    );
  }
}

class _WalletError extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _WalletError({required this.message, required this.onRetry});

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