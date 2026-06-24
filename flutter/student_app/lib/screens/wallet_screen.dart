import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';
import '../utils/api_utils.dart';

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
      final balanceResponse = await ApiService.getCreditBalance();
      final packsResponse = await ApiService.getCreditPacks();

      if (!mounted) return;

      if (balanceResponse.statusCode == 200 && packsResponse.statusCode == 200) {
        final balanceData = jsonDecode(balanceResponse.body);
        final packsData = jsonDecode(packsResponse.body);
        setState(() {
          _balanceData = balanceData;
          _creditPacks = ApiUtils.extractList(packsData, 'packs').where((pack) => pack['is_active'] == 1).toList();
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
          amountInr: (pack['amount_inr'] ?? 0) is int ? pack['amount_inr'] : int.tryParse(pack['amount_inr'].toString()) ?? 0,
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
    return Scaffold(
      appBar: AppBar(title: const Text('My Wallet')),
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
                        const SizedBox(height: 16),
                        Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _fetchWalletData, child: const Text('Retry')),
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
                        const Text(
                          'Recharge Credits',
                          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
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
        boxShadow: const [BoxShadow(color: Color(0x5532115F), blurRadius: 20, offset: Offset(0, 10))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Total Balance', style: TextStyle(color: Color(0xFFE9D5FF), fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            '$balance Credits',
            style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: -1),
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
        Text(title, style: const TextStyle(color: Color(0xBBFFFFFF), fontSize: 12)),
        const SizedBox(height: 4),
        Text('$amount', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
    final creditType = pack['credit_type']?.toString().replaceAll('_', ' ').toUpperCase() ?? 'GENERAL';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.elevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        title: Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppTheme.primaryLight.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                child: Text('+ $credits Credits', style: const TextStyle(color: AppTheme.primaryLight, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(8)),
                child: Text(creditType, style: const TextStyle(color: AppTheme.muted, fontWeight: FontWeight.bold, fontSize: 10)),
              ),
            ],
          ),
        ),
        trailing: ElevatedButton(
          onPressed: onTap,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: Text('₹$amountInr', style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}
