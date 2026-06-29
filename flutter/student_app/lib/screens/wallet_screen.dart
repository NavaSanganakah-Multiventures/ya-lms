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
  bool _isLoading = true;
  String? _error;

  bool _showCustom = true;
  double _customAmount = 101;
  String _selectedType = 'ai';

  Map<String, dynamic> _pricing = {
    'ai_credits_per_inr': '10',
    'ai_featured_pack_amount_inr': '101',
    'ai_featured_pack_credits': '1000',
    'ai_credit_deduction_per_request': '2',
  };

  int get _calculatedCredits {
    final featuredAmount = int.tryParse(_pricing['ai_featured_pack_amount_inr'] ?? '101') ?? 101;
    final featuredCredits = int.tryParse(_pricing['ai_featured_pack_credits'] ?? '1000') ?? 1000;
    final creditsPerInr = int.tryParse(_pricing['ai_credits_per_inr'] ?? '10') ?? 10;
    if (_selectedType == 'ai' && _customAmount.round() == featuredAmount) {
      return featuredCredits;
    }
    return _customAmount.round() * creditsPerInr;
  }

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
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
      ]);
      final balanceResponse = results[0];
      final packsResponse = results[1];
      final settingsResponse = results[2];

      if (!mounted) return;

      if (balanceResponse.statusCode == 200 && packsResponse.statusCode == 200) {
        final balanceData = jsonDecode(balanceResponse.body);
        final packsData = jsonDecode(packsResponse.body);

        if (settingsResponse.statusCode == 200) {
          final settingsData = jsonDecode(settingsResponse.body);
          final settings = settingsData['settings'] ?? {};
          setState(() {
            _pricing = {
              'ai_credits_per_inr': (settings['ai_credits_per_inr'] ?? '10').toString(),
              'ai_featured_pack_amount_inr': (settings['ai_featured_pack_amount_inr'] ?? '101').toString(),
              'ai_featured_pack_credits': (settings['ai_featured_pack_credits'] ?? '1000').toString(),
              'ai_credit_deduction_per_request': (settings['ai_credit_deduction_per_request'] ?? '2').toString(),
            };
            _customAmount = double.tryParse(_pricing['ai_featured_pack_amount_inr'] ?? '101') ?? 101;
          });
        }

        setState(() {
          _balanceData = balanceData;
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
          amountInr: (pack['amount_inr'] ?? 0) is int
              ? pack['amount_inr']
              : num.tryParse(pack['amount_inr'].toString())?.toInt() ?? 0,
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
      'title': '$_selectedType Credits',
      'credit_type': _selectedType,
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

                          Row(
                            children: [
                              Expanded(
                                child: _ToggleTab(
                                  label: 'Custom Amount',
                                  selected: _showCustom,
                                  onTap: () => setState(() => _showCustom = true),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _ToggleTab(
                                  label: 'Credit Packs',
                                  selected: !_showCustom,
                                  onTap: () => setState(() => _showCustom = false),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          if (_showCustom) _buildCustomAmountSection(),

                          if (!_showCustom) ...[
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
                        ],
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _buildCustomAmountSection() {
    final creditsPerInr = int.tryParse(_pricing['ai_credits_per_inr'] ?? '10') ?? 10;
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
            '₹1 = $creditsPerInr credits • $deduction credits deducted per AI request',
            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),

          Row(
            children: [
              _TypeChip(
                label: 'AI',
                selected: _selectedType == 'ai',
                color: const Color(0xFFF97316),
                onTap: () => setState(() => _selectedType = 'ai'),
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: 'Live',
                selected: _selectedType == 'live_class',
                color: const Color(0xFF10B981),
                onTap: () => setState(() => _selectedType = 'live_class'),
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: 'Self Study',
                selected: _selectedType == 'self_study',
                color: const Color(0xFF3B82F6),
                onTap: () => setState(() => _selectedType = 'self_study'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          TextField(
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
        padding: const EdgeInsets.symmetric(vertical: 14),
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

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _TypeChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? color.withValues(alpha: 0.2) : AppTheme.elevated,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? color : AppTheme.border,
              width: selected ? 2 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: selected ? color : AppTheme.textSecondary,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
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
    final balance = balanceData?['balance'] ?? 0;
    final aiBalance = balanceData?['ai_balance'] ?? 0;
    final liveClassBalance = balanceData?['live_class_balance'] ?? 0;
    final selfStudyBalance = balanceData?['self_study_balance'] ?? 0;

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
          const Text('Total Balance',
              style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            '$balance Credits',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _SubBalance(title: 'AI', amount: aiBalance),
              _SubBalance(title: 'Live Classes', amount: liveClassBalance),
              _SubBalance(title: 'Self Study', amount: selfStudyBalance),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubBalance extends StatelessWidget {
  final String title;
  final num amount;

  const _SubBalance({required this.title, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style:
                const TextStyle(color: Color(0xBBFFFFFF), fontSize: 12)),
        const SizedBox(height: 4),
        Text('$amount',
            style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold)),
      ],
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
    final amountInr = pack['amount_inr'] ?? 0;
    final creditType = pack['credit_type']
            ?.toString()
            .replaceAll('_', ' ')
            .toUpperCase() ??
        'GENERAL';

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
                    Row(
                      children: [
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
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black12,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(creditType,
                              style: const TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10)),
                        ),
                      ],
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
