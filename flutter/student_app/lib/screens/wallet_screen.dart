import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';
import '../utils/api_utils.dart';
import '../utils/responsive.dart';
import '../widgets/app_shimmer.dart';
import '../services/real_time_service.dart';

class WalletScreen extends StatefulWidget {
 WalletScreen({super.key});

 @override
 State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
 static String _cacheKey = 'wallet_cache';
 static String _cacheTimeKey = 'wallet_cache_time';
 static int _cacheTtlMs = 5 * 60 * 1000; // 5 minutes

 Map<String, dynamic>? _balanceData;
 List<dynamic> _creditPacks = [];
 List<dynamic> _ledgerHistory = [];
 bool _isLoading = true;
 bool _isShowingCached = false;
 String? _error;

 String _selectedTab = 'custom';
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
 _realtimeSub = RealTimeService.instance.dataStream.listen((event) {
   if (!mounted) return;
   if (event['entity'] == 'wallet') {
     _fetchWalletData(skipCache: true);
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

 // 1. Pehle cache dikhayein
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

 // 2. APIs fetch karein independently
 Map<String, dynamic>? balanceData;
 List<dynamic> creditPacks = [];
 Map<String, dynamic> settingsData = {};
 List<dynamic> ledgerData = [];

 try {
 final balanceResponse = await ApiService.getWalletBalance();
 if (balanceResponse.statusCode == 200) {
 balanceData = balanceResponse.data;
 }
 } catch (e) {
 debugPrint('Wallet: balance fetch failed: $e');
 }

 try {
 final packsResponse = await ApiService.getCreditPacks();
 if (packsResponse.statusCode == 200) {
 final packsData = packsResponse.data;
 creditPacks = ApiUtils.extractList(packsData, 'packs')
 .where((pack) =>
 pack is Map &&
 (pack['is_active'] == 1 ||
 pack['is_active'] == "1" ||
 pack['is_active'] == true))
 .toList();
 }
 } catch (e) {
 debugPrint('Wallet: packs fetch failed: $e');
 }

 try {
 final settingsResponse = await ApiService.getSettings();
 if (settingsResponse.statusCode == 200) {
 final settingsDataJson = settingsResponse.data;
 settingsData = settingsDataJson['settings'] ?? {};
 }
 } catch (e) {
 debugPrint('Wallet: settings fetch failed: $e');
 }

 try {
 final ledgerResponse = await ApiService.getWalletLedger();
 if (ledgerResponse.statusCode == 200) {
 final lData = ledgerResponse.data;
 ledgerData = lData['ledger'] ?? [];
 }
 } catch (e) {
 debugPrint('Wallet: ledger fetch failed: $e');
 }

 if (!mounted) return;

 if (balanceData == null && creditPacks.isEmpty && ledgerData.isEmpty && !skipCache && _isShowingCached) {
 // Network failed but cache valid data still visible; just stop spinner.
 setState(() {
 _isLoading = false;
 _isShowingCached = false;
 });
 return;
 }

 final pricing = {
 'ai_featured_pack_amount_rupees': settingsData['ai_featured_pack_amount_rupees']?.toString() ?? '101',
 'ai_credit_deduction_per_request': settingsData['ai_credit_deduction_per_request']?.toString() ?? '2',
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
 _fetchWalletData(skipCache: true);
 }
 });
 }

 void _purchaseCustom() {
 final amount = _customAmount.round();
 if (amount <= 0) return;

 final item = {
 'title': 'Wallet Top-up',
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
 _fetchWalletData(skipCache: true);
 }
 });
 }

 @override
 Widget build(BuildContext context) {
 return Container(
 color: AppTheme.backgroundOf(context),
 child: SafeArea(
 child: ResponsiveLayout(
 child: _isLoading
 ? SingleChildScrollView(
 padding: EdgeInsets.all(24),
 child: Column(
 children: [
 ShimmerCard(height: 160),
 SizedBox(height: 32),
 Row(
 children: [
 Expanded(child: ShimmerCard(height: 48)),
 SizedBox(width: 8),
 Expanded(child: ShimmerCard(height: 48)),
 SizedBox(width: 8),
 Expanded(child: ShimmerCard(height: 48)),
 ],
 ),
 SizedBox(height: 24),
 ...List.generate(3, (_) => ShimmerCard(height: 80)),
 ],
 ),
 )
 : _error != null
 ? Center(
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.error_outline,
 color: AppTheme.danger, size: 48),
 SizedBox(height: 16),
 Text(_error!,
 style:
 TextStyle(color: AppTheme.danger)),
 SizedBox(height: 16),
 ElevatedButton(
 onPressed: _fetchWalletData,
 child: Text('Retry')),
 ],
 ),
 )
 : RefreshIndicator(
 color: AppTheme.primary,
 backgroundColor: AppTheme.elevatedOf(context),
 onRefresh: () => _fetchWalletData(skipCache: true),
 child: ListView(
 padding: EdgeInsets.all(24.0),
 children: [
 _BalanceCard(balanceData: _balanceData),
 SizedBox(height: 32),

 SingleChildScrollView(
 scrollDirection: Axis.horizontal,
 child: Row(
 children: [
 _ToggleTab(
 label: 'Custom Amount',
 selected: _selectedTab == 'custom',
 onTap: () => setState(() => _selectedTab = 'custom'),
 ),
 SizedBox(width: 8),
 _ToggleTab(
 label: 'Packs',
 selected: _selectedTab == 'packs',
 onTap: () => setState(() => _selectedTab = 'packs'),
 ),
 SizedBox(width: 8),
 _ToggleTab(
 label: 'History',
 selected: _selectedTab == 'history',
 onTap: () => setState(() => _selectedTab = 'history'),
 ),
 ],
 ),
 ),
 SizedBox(height: 16),

 if (_selectedTab == 'custom') _buildCustomAmountSection(),

 if (_selectedTab == 'packs') ...[
 Text(
 'Recharge Wallet',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 16),
 if (_creditPacks.isEmpty)
 Text(
 'No packs available at the moment.',
 style: TextStyle(color: AppTheme.mutedOf(context)),
 )
 else
 ..._creditPacks.map((pack) => _CreditPackTile(
 pack: pack is Map<String, dynamic> ? pack : <String, dynamic>{},
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
 final deduction = _pricing['ai_credit_deduction_per_request'] ?? '2';

 return Container(
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(24),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 padding: EdgeInsets.all(24),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 'Add Funds',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 8),
 Text(
 '₹${(num.tryParse(deduction.toString()) ?? 0).toStringAsFixed(2)} deducted per AI request',
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 12),
 ),
 SizedBox(height: 20),

  TextField(
  controller: _amountController,
  keyboardType: TextInputType.numberWithOptions(decimal: false),
  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
 decoration: InputDecoration(
 labelText: 'Amount (₹)',
 prefixText: '₹ ',
 prefixStyle: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 16,
 ),
 filled: true,
 fillColor: AppTheme.elevatedOf(context),
 border: OutlineInputBorder(
 borderRadius: BorderRadius.circular(16),
 borderSide: BorderSide.none,
 ),
 focusedBorder: OutlineInputBorder(
 borderRadius: BorderRadius.circular(16),
 borderSide: BorderSide(color: AppTheme.primaryLight, width: 2),
 ),
 ),
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.bold,
 ),
 onChanged: (val) {
 setState(() {
 _customAmount = double.tryParse(val) ?? 0;
 });
 },
 ),
 SizedBox(height: 20),

 Container(
 width: double.infinity,
 padding: EdgeInsets.all(20),
 decoration: BoxDecoration(
 color: AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.circular(20),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Column(
 children: [
 Text(
 'Amount to add',
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 14),
 ),
 SizedBox(height: 8),
 Text(
 '₹${_customAmount.toStringAsFixed(2)}',
 style: TextStyle(
 color: AppTheme.primaryLight,
 fontSize: 32,
 fontWeight: FontWeight.w900,
 ),
 ),
 ],
 ),
 ),
 SizedBox(height: 20),

 SizedBox(
 width: double.infinity,
 height: 56,
 child: ElevatedButton(
 onPressed: _customAmount >= 10 ? _purchaseCustom : null,
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 disabledBackgroundColor: AppTheme.borderOf(context),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(16),
 ),
 ),
 child: Text(
 'Pay ₹${_customAmount.toStringAsFixed(2)}',
 style: TextStyle(
 fontSize: 18,
 fontWeight: FontWeight.bold,
 color: AppTheme.surfaceOf(context),
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
 return Center(
 child: Padding(
 padding: EdgeInsets.all(32.0),
 child: Text(
 'No transaction history yet.',
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 16),
 ),
 ),
 );
 }
 return Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 'Transaction History',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 20,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 16),
 ..._ledgerHistory.map((item) {
 final amount = num.tryParse(item['change_rupees']?.toString() ?? '0') ?? 0;
 final balanceAfter = item['balance_after_rupees']?.toString() ?? '';
 final isPositive = amount > 0;
 final dateStr = item['created_at']?.toString() ?? '';
 final reason = item['reason']?.toString() ?? 'Transaction';
 
 return Container(
 margin: EdgeInsets.only(bottom: 12),
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 children: [
 Container(
 padding: EdgeInsets.all(10),
 decoration: BoxDecoration(
 color: isPositive ? AppTheme.success.withAlphaOpacity( 0.1) : AppTheme.danger.withAlphaOpacity( 0.1),
 shape: BoxShape.circle,
 ),
 child: Icon(
 isPositive ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
 color: isPositive ? AppTheme.success : AppTheme.danger,
 size: 20,
 ),
 ),
 SizedBox(width: 16),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 reason,
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 14,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 4),
 Row(
 children: [
 Text(
 dateStr.split('T').first,
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 12),
 ),
 ],
 ),
 ],
 ),
 ),
 SizedBox(width: 16),
 Column(
 crossAxisAlignment: CrossAxisAlignment.end,
 children: [
 Text(
 '${isPositive ? '+' : ''}₹${amount.toStringAsFixed(2)}',
 style: TextStyle(
 color: isPositive ? AppTheme.success : AppTheme.danger,
 fontWeight: FontWeight.bold,
 fontSize: 16,
 ),
 ),
 if (balanceAfter.isNotEmpty && balanceAfter != '0')
 Padding(
 padding: EdgeInsets.only(top: 2),
 child: Text(
 'Balance: ₹${(num.tryParse(balanceAfter) ?? 0).toStringAsFixed(2)}',
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 10),
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

 _ToggleTab({
 required this.label,
 required this.selected,
 required this.onTap,
 });

 @override
 Widget build(BuildContext context) {
 return GestureDetector(
 onTap: onTap,
 child: Container(
 padding: EdgeInsets.symmetric(vertical: 14, horizontal: 16),
 decoration: BoxDecoration(
 color: selected ? AppTheme.primary : AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(
 color: selected ? AppTheme.primaryLight : AppTheme.borderOf(context),
 ),
 ),
 child: Center(
 child: Text(
 label,
 style: TextStyle(
 color: selected ? AppTheme.surfaceOf(context) : AppTheme.textSecondaryOf(context),
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

 _BalanceCard({required this.balanceData});

 @override
 Widget build(BuildContext context) {
 final balanceInr = balanceData?['balance_rupees'] ?? 0;

 return Container(
 padding: EdgeInsets.all(24),
 decoration: BoxDecoration(
 gradient: AppTheme.auroraGradient,
 borderRadius: BorderRadius.circular(24),
 border: Border.all(color: Color(0x55FFFFFF)),
 boxShadow: [
 BoxShadow(
 color: Color(0x5532115F),
 blurRadius: 20,
 offset: Offset(0, 10))
 ],
 ),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text('Wallet Balance',
 style: TextStyle(color: Colors.white70, fontSize: 16)),
 SizedBox(height: 8),
 Text(
 '₹${(balanceInr is num ? balanceInr : double.tryParse(balanceInr.toString()) ?? 0).toStringAsFixed(2)}',
 style: TextStyle(
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

 _CreditPackTile({required this.pack, required this.onTap});

 @override
 Widget build(BuildContext context) {
 final name = pack['name']?.toString() ?? 'Pack';
 final amountInr = (num.tryParse(pack['amount_rupees']?.toString() ?? '0') ?? 0).toDouble();

 return Container(
 margin: EdgeInsets.only(bottom: 16),
 decoration: BoxDecoration(
 color: AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.circular(20),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: InkWell(
 onTap: onTap,
 borderRadius: BorderRadius.circular(20),
 child: Padding(
 padding:
 EdgeInsets.symmetric(horizontal: 20, vertical: 16),
 child: Row(
 children: [
 Expanded(
 child: Text(name,
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 18),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 ),
 SizedBox(width: 16),
 ElevatedButton(
 onPressed: onTap,
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 foregroundColor: Colors.white,
 minimumSize: Size(80, 40),
 padding: EdgeInsets.symmetric(
 horizontal: 16, vertical: 12),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(12)),
 ),
 child: Text('₹${amountInr.toStringAsFixed(2)}',
 style:
 TextStyle(fontWeight: FontWeight.bold)),
 ),
 ],
 ),
 ),
 ),
 );
 }
}