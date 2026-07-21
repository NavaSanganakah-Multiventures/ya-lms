import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';
import '../utils/api_utils.dart';
import '../utils/responsive.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Map<String, dynamic>? _balanceData;
  List<dynamic> _creditPacks = [];
  List<dynamic> _ledgerHistory = [];
  bool _isLoading = true;
  String? _error;

  String _selectedTab = 'custom';
  double _customAmount = 101;
  late final TextEditingController _amountController;

  Map<String, dynamic> _pricing = {
    'ai_credits_per_rupee': '10',
    'ai_featured_pack_amount_rupees': '101',
    'ai_featured_pack_credits': '1000',
    'ai_credit_deduction_per_request': '2',
  };

  int get _calculatedCredits {
    final featuredAmount = int.tryParse(_pricing['ai_featured_pack_amount_rupees'] ?? '101') ?? 101;
    final featuredCredits = int.tryParse(_pricing['ai_featured_pack_credits'] ?? '1000') ?? 1000;
    final creditsPerRupee = int.tryParse(_pricing['ai_credits_per_rupee'] ?? '10') ?? 10;
    if (_customAmount.round() == featuredAmount) {
      return featuredCredits;
    }
    return _customAmount.round() * creditsPerRupee;
  }

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: _customAmount.round().toString());
    _fetchWalletData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _fetchWalletData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        ApiService.getCreditBalance(),
        ApiService.getCreditPacks(),
        ApiService.getCreditSettings(),
        ApiService.getCreditLedger(),
      ]);
      final balanceResponse = results[0];
      final packsResponse = results[1];
      final settingsResponse = results[2];
      final ledgerResponse = results[3];

      if (!mounted) return;

      if (balanceResponse.statusCode == 200 && packsResponse.statusCode == 200) {
        final balanceData = jsonDecode(balanceResponse.body);
        final packsData = jsonDecode(packsResponse.body);
        
        List<dynamic> ledgerData = [];
        if (ledgerResponse.statusCode == 200) {
          final lData = jsonDecode(ledgerResponse.body);
          ledgerData = lData['ledger'] ?? [];
        }

        if (settingsResponse.statusCode == 200) {
          final settingsData = jsonDecode(settingsResponse.body);
          final settings = settingsData['settings'] ?? {};
          setState(() {
            _pricing = {
              'ai_credits_per_rupee': (settings['ai_credits_per_rupee'] ?? '10').toString(),
              'ai_featured_pack_amount_rupees': (settings['ai_featured_pack_amount_rupees'] ?? '101').toString(),
              'ai_featured_pack_credits': (settings['ai_featured_pack_credits'] ?? '1000').toString(),
              'ai_credit_deduction_per_request': (settings['ai_credit_deduction_per_request'] ?? '2').toString(),
            };
            _customAmount = double.tryParse(_pricing['ai_featured_pack_amount_rupees'] ?? '101') ?? 101;
            _amountController.text = _customAmount.round().toString();
          });
        }

        setState(() {
          _balanceData = balanceData;
          _ledgerHistory = ledgerData;
          _creditPacks = ApiUtils.extractList(packsData, 'packs')
              .where((pack) =>
                  pack['is_active'] == 1 ||
                  pack['is_active'] == "1" ||
                  pack['is_active'] == true)
              .toList();
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load wallet data');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _purchasePack(Map<String, dynamic> pack) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CheckoutScreen(
          item: pack,
          itemType: 'credit_pack',
          amountInr: (pack['amount_rupees'] ?? 0) is int
              ? pack['amount_rupees']
              : num.tryParse(pack['amount_rupees'].toString())?.toInt() ?? 0,
        ),
      ),
    ).then((success) {
      if (success == true && mounted) {
        _fetchWalletData();
      }
    });
  }

  void _purchaseCustom() {
    final amount = _customAmount.round();
    if (amount <= 0) return;

    final item = {
      'title': 'Wallet Top-up',
      'credits': _calculatedCredits,
    };

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
      if (success == true && mounted) {
        _fetchWalletData();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.background,
      child: SafeArea(
        child: ResponsiveLayout(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary))
              : _error != null
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline,
                              color: AppTheme.danger, size: 48),
                          const SizedBox(height: 16),
                          Text(_error!,
                              style:
                                  const TextStyle(color: AppTheme.danger)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                              onPressed: _fetchWalletData,
                              child: const Text('Retry')),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.elevated,
                      onRefresh: _fetchWalletData,
                      child: ListView(
                        padding: const EdgeInsets.all(24.0),
                        children: [
                          _BalanceCard(balanceData: _balanceData),
                          const SizedBox(height: 32),

                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _ToggleTab(
                                  label: 'Custom Amount',
                                  selected: _selectedTab == 'custom',
                                  onTap: () => setState(() => _selectedTab = 'custom'),
                                ),
                                const SizedBox(width: 8),
                                _ToggleTab(
                                  label: 'Credit Packs',
                                  selected: _selectedTab == 'packs',
                                  onTap: () => setState(() => _selectedTab = 'packs'),
                                ),
                                const SizedBox(width: 8),
                                _ToggleTab(
                                  label: 'History',
                                  selected: _selectedTab == 'history',
                                  onTap: () => setState(() => _selectedTab = 'history'),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          if (_selectedTab == 'custom') _buildCustomAmountSection(),

                          if (_selectedTab == 'packs') ...[
                            const Text(
                              'Recharge Credits',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (_creditPacks.isEmpty)
                              const Text(
                                'No credit packs available at the moment.',
                                style: TextStyle(color: AppTheme.muted),
                              )
                            else
                              ..._creditPacks.map((pack) => _CreditPackTile(
                                    pack: pack as Map<String, dynamic>,
                                    onTap: () => _purchasePack(pack),
                                  )),
                          ],

                          if (_selectedTab == 'history') _buildHistorySection(),
                        ],
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _buildCustomAmountSection() {
    final creditsPerRupee = int.tryParse(_pricing['ai_credits_per_rupee'] ?? '10') ?? 10;
    final deduction = _pricing['ai_credit_deduction_per_request'] ?? '2';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Add Credits',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '₹1 = $creditsPerRupee credits • $deduction credits deducted per AI request',
            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),

          const SizedBox(height: 20),

          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: false),
            decoration: InputDecoration(
              labelText: 'Amount (INR)',
              prefixText: '₹ ',
              prefixStyle: const TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
              filled: true,
              fillColor: AppTheme.elevated,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppTheme.primaryLight, width: 2),
              ),
            ),
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            onChanged: (val) {
              setState(() {
                _customAmount = double.tryParse(val) ?? 0;
              });
            },
          ),
          const SizedBox(height: 20),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.elevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                const Text(
                  'You will get',
                  style: TextStyle(color: AppTheme.muted, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Text(
                  '$_calculatedCredits Credits',
                  style: const TextStyle(
                    color: AppTheme.primaryLight,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _customAmount >= 10 ? _purchaseCustom : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.border,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                'Pay ₹${_customAmount.round()}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.surface,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistorySection() {
    if (_ledgerHistory.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text(
            'No transaction history yet.',
            style: TextStyle(color: AppTheme.muted, fontSize: 16),
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Transaction History',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 16),
        ..._ledgerHistory.map((item) {
          final amount = num.tryParse(item['change_rupees']?.toString() ?? '0') ?? 0;
          final balanceAfter = item['balance_after_rupees']?.toString() ?? '';
          final isPositive = amount > 0;
          final dateStr = item['created_at']?.toString() ?? '';
          final reason = item['reason']?.toString() ?? 'Transaction';
          
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isPositive ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.danger.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isPositive ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                    color: isPositive ? AppTheme.success : AppTheme.danger,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        reason,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            dateStr.split('T').first,
                            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${isPositive ? '+' : ''}$amount',
                      style: TextStyle(
                        color: isPositive ? AppTheme.success : AppTheme.danger,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    if (balanceAfter.isNotEmpty && balanceAfter != '0')
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Balance: $balanceAfter',
                          style: const TextStyle(color: AppTheme.muted, fontSize: 10),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _ToggleTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ToggleTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary : AppTheme.elevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? AppTheme.primaryLight : AppTheme.border,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: selected ? AppTheme.surface : AppTheme.textSecondary,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final Map<String, dynamic>? balanceData;

  const _BalanceCard({required this.balanceData});

  @override
  Widget build(BuildContext context) {
    final balanceInr = balanceData?['balance_rupees'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.auroraGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0x55FFFFFF)),
        boxShadow: const [
          BoxShadow(
              color: Color(0x5532115F),
              blurRadius: 20,
              offset: Offset(0, 10))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Wallet Balance',
              style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            '₹$balanceInr',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
            ),
          ),
        ],
      ),
    );
  }
}

class _CreditPackTile extends StatelessWidget {
  final Map<String, dynamic> pack;
  final VoidCallback onTap;

  const _CreditPackTile({required this.pack, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = pack['name']?.toString() ?? 'Credit Pack';
    final credits = pack['credits'] ?? 0;
    final amountInr = pack['amount_rupees'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.elevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(name,
                        style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 18)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight
                            .withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('+ $credits Credits',
                          style: const TextStyle(
                              color: AppTheme.primaryLight,
                              fontWeight: FontWeight.bold,
                              fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(80, 40),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('₹$amountInr',
                    style:
                        const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
