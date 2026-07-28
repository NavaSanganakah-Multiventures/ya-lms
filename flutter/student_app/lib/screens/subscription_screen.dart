import 'dart:async';
import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../services/real_time_service.dart';

class SubscriptionScreen extends StatefulWidget {
 SubscriptionScreen({super.key});

 @override
 State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
 List<dynamic> _plans = [];
 Map<String, dynamic>? _mySub;
 bool _isLoading = true;
 String? _error;

 late Razorpay _razorpay;
 bool _subscribing = false;
 bool _cancelling = false;
 bool _disposed = false;

 StreamSubscription<Map<String, dynamic>>? _realtimeSub;

 @override
 void initState() {
 super.initState();
 _razorpay = Razorpay();
 _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
 _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
 _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
 _fetchData();
 _realtimeSub = RealTimeService.instance.dataStream.listen((event) {
   if (!mounted) return;
   if (event['entity'] == 'subscription') {
     _fetchData();
   }
 });
 }

 @override
 void dispose() {
 _disposed = true;
 _razorpay.clear();
 _realtimeSub?.cancel();
 super.dispose();
 }

 Future<void> _fetchData() async {
 if (!mounted) return;
 setState(() {
 _isLoading = true;
 _error = null;
 });

 try {
 final results = await Future.wait([
 ApiService.getSubscriptionPlans(),
 ApiService.getUserSubscription(),
 ]);

 if (!mounted) return;

 if (results[0].statusCode == 200) {
 final plansData = results[0].data;
 setState(() {
 _plans = plansData['plans'] ?? [];
 });
 }

 if (results[1].statusCode == 200) {
 final subData = results[1].data;
 setState(() {
 _mySub = subData['subscription'];
 });
 }

 setState(() => _isLoading = false);
 } catch (e) {
 if (mounted) {
 setState(() {
 _error = e.toString();
 _isLoading = false;
 });
 }
 }
 }

 Future<void> _subscribe(String planId) async {
 setState(() => _subscribing = true);

 try {
 final res = await ApiService.createSubscription(planId);
 if (!mounted) return;

 if (res.statusCode == 200) {
 final data = res.data;
 final subscriptionId = data['subscription_id'] ?? '';
 final key = data['key'] ?? '';
 final plan = data['plan'] as Map<String, dynamic>?;

 if (subscriptionId.isEmpty || key.isEmpty) {
 throw Exception('Invalid subscription response');
 }

 final options = {
 'key': key,
 'subscription_id': subscriptionId,
 'name': 'Adityanveshan',
 'description': plan?['name'] ?? 'Subscription',
 'prefill': {
 'contact': data['user']?['phone'] ?? '',
 'email': data['user']?['email'] ?? '',
 },
 'theme': {
 'color': '#${AppTheme.primaryHex}',
 },
 };

 _razorpay.open(options);
 } else {
 final errData = res.data;
 throw Exception(errData['error'] ?? 'Subscription create failed');
 }
 } catch (e) {
 if (mounted) {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Subscription failed: $e'),
 backgroundColor: AppTheme.danger,
 ),
 );
 }
 } finally {
 if (mounted) setState(() => _subscribing = false);
 }
 }

 void _handlePaymentSuccess(PaymentSuccessResponse response) {
 if (_disposed) return;
 // Don't set status to 'active' here — backend webhook may not have fired yet.
 // _fetchData() will return the actual status from the server.
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Subscription successful! Activating...'),
 backgroundColor: AppTheme.success,
 ),
 );
 _fetchData();
 }

 void _handlePaymentError(PaymentFailureResponse response) {
 if (_disposed) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Subscription payment failed: ${response.message}'),
 backgroundColor: AppTheme.danger,
 ),
 );
 }

 void _handleExternalWallet(ExternalWalletResponse response) {
 if (_disposed) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('External Wallet: ${response.walletName}'),
 ),
 );
 }

 Future<void> _cancelSubscription() async {
 final confirm = await showDialog<bool>(
 context: context,
 builder: (ctx) => AlertDialog(
 backgroundColor: AppTheme.surfaceOf(context),
 title: Text('Cancel Subscription?',
 style: TextStyle(color: AppTheme.textPrimaryOf(context))),
 content: Text(
 'Aapka subscription cancel ho jayega. Current period end tak access rahega.',
 style: TextStyle(color: AppTheme.textSecondaryOf(context)),
 ),
 actions: [
 TextButton(
 onPressed: () => Navigator.pop(ctx, false),
 child: Text('Cancel',
 style: TextStyle(color: AppTheme.mutedOf(context))),
 ),
 ElevatedButton(
 onPressed: () => Navigator.pop(ctx, true),
 style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
 child: Text('Confirm Cancel',
 style: TextStyle(color: Colors.white)),
 ),
 ],
 ),
 );

 if (confirm != true) return;

 setState(() => _cancelling = true);
 try {
 final res = await ApiService.cancelSubscription();
 if (mounted) {
 if (res.statusCode == 200) {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Subscription cancelled. Access period end tak rahega.'),
 backgroundColor: AppTheme.success,
 ),
 );
 setState(() => _mySub = null);
 _fetchData();
 } else {
 final errData = res.data;
 throw Exception(errData['error'] ?? 'Cancel failed');
 }
 }
 } catch (e) {
 if (mounted) {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Cancel failed: $e'),
 backgroundColor: AppTheme.danger,
 ),
 );
 }
 } finally {
 if (mounted) setState(() => _cancelling = false);
 }
 }

 @override
 Widget build(BuildContext context) {
 return Scaffold(
 appBar: AppBar(title: Text('Subscription Plans')),
 backgroundColor: AppTheme.backgroundOf(context),
 body: SafeArea(
 child: ResponsiveLayout(
 child: _isLoading
 ? Center(
 child: CircularProgressIndicator(color: AppTheme.primary))
 : _error != null
 ? _buildError()
 : RefreshIndicator(
 onRefresh: _fetchData,
 child: ListView(
 padding: EdgeInsets.all(24),
 children: [
 if (_mySub != null) _buildCurrentSubscription(),
 SizedBox(height: 24),
 Text(
 'Available Plans',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 22,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(height: 4),
 Text(
 'Ek plan select karein jo aapki zarooraton ke liye sahi ho.',
 style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 13),
 ),
 SizedBox(height: 16),
 if (_plans.isEmpty)
 Padding(
 padding: EdgeInsets.only(top: 40),
 child: Center(
 child: Text(
 'Abhi koi subscription plan available nahi hai.',
 style: TextStyle(color: AppTheme.mutedOf(context)),
 ),
 ),
 )
 else
 ..._plans.map((plan) => _PlanCard(
 plan: plan as Map<String, dynamic>,
 isCurrentPlan: _mySub?['plan_id'] == plan['id'],
 subscribing: _subscribing,
 onSubscribe: () => _subscribe(plan['id']),
 )),
 ],
 ),
 ),
 ),
 ),
 );
 }

 Widget _buildCurrentSubscription() {
 final status = _mySub?['status'] ?? '';
 final planName = _mySub?['plan_name'] ?? 'Subscription';
 final interval = _mySub?['interval'] ?? '';

 return Container(
 padding: EdgeInsets.all(20),
 decoration: BoxDecoration(
 gradient: AppTheme.auroraGradient,
 borderRadius: BorderRadius.circular(24),
 border: Border.all(color: Color(0x55FFFFFF)),
 ),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Row(
 children: [
 Icon(Icons.verified, color: Colors.white70, size: 20),
 SizedBox(width: 8),
 Text(
 status == 'active' ? 'ACTIVE' : status.toUpperCase(),
 style: TextStyle(
 color: Colors.white,
 fontSize: 12,
 fontWeight: FontWeight.w900,
 letterSpacing: 1.5,
 ),
 ),
 ],
 ),
 SizedBox(height: 16),
 Text('Current Plan',
 style: TextStyle(color: Colors.white70, fontSize: 14)),
 SizedBox(height: 4),
 Text(planName,
 style: TextStyle(
 color: Colors.white,
 fontSize: 22,
 fontWeight: FontWeight.w900,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 if (interval.isNotEmpty) ...[
 SizedBox(height: 4),
 Text(interval,
 style: TextStyle(color: Colors.white60, fontSize: 13)),
 ],
 SizedBox(height: 20),
 SizedBox(
 width: double.infinity,
 child: ElevatedButton.icon(
 onPressed: _cancelling ? null : _cancelSubscription,
 icon: _cancelling
 ? SizedBox(
 width: 18,
 height: 18,
 child: CircularProgressIndicator(
 strokeWidth: 2, color: Colors.white),
 )
 : Icon(Icons.cancel_outlined, size: 18),
 label: Text(_cancelling ? 'Cancelling...' : 'Cancel Subscription'),
 style: ElevatedButton.styleFrom(
 backgroundColor: Colors.white.withAlphaOpacity( 0.2),
 foregroundColor: Colors.white,
 padding: EdgeInsets.symmetric(vertical: 12),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(14),
 side: BorderSide(color: Colors.white.withAlphaOpacity( 0.3)),
 ),
 ),
 ),
 ),
 ],
 ),
 );
 }

 Widget _buildError() {
 return Center(
 child: Padding(
 padding: EdgeInsets.all(24),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
 SizedBox(height: 16),
 Text(_error!, textAlign: TextAlign.center,
 style: TextStyle(color: AppTheme.danger)),
 SizedBox(height: 16),
 ElevatedButton(onPressed: _fetchData, child: Text('Retry')),
 ],
 ),
 ),
 );
 }
}

class _PlanCard extends StatelessWidget {
 final Map<String, dynamic> plan;
 final bool isCurrentPlan;
 final bool subscribing;
 final VoidCallback onSubscribe;

 _PlanCard({
 required this.plan,
 required this.isCurrentPlan,
 required this.subscribing,
 required this.onSubscribe,
 });

 @override
 Widget build(BuildContext context) {
 final name = plan['name'] ?? 'Plan';
 final amountInr = plan['amount_rupees'] ?? 0;
 final interval = plan['interval'] ?? 'monthly';
 final courseAccess = plan['course_access_type'] ?? 'none';
 final batchAccess = plan['batch_access_type'] ?? 'none';
 final aiCredits = plan['ai_credits'] ?? 0;
 final liveSessionAccess = plan['live_session_access'] == 1;
 final isLifetime = plan['is_lifetime'] == 1;

 final features = <String>[];
 if (courseAccess == 'all') features.add('All courses access');
 if (courseAccess == 'user_choice') {
 features.add('Choose ${plan['max_course_selection'] ?? '?'} courses');
 }
 if (batchAccess == 'user_choice') {
 features.add('Choose ${plan['max_batch_selection'] ?? '?'} batches');
 }
 if (aiCredits > 0) features.add('$aiCredits AI credits');
 if (liveSessionAccess) features.add('Live session access');
 if (plan['live_class_amount_rupees'] != null &&
 (plan['live_class_amount_rupees'] as num) > 0) {
 features.add('₹${((plan['live_class_amount_rupees'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)} Live Class Wallet');
 }

 return Container(
 margin: EdgeInsets.only(bottom: 16),
 decoration: BoxDecoration(
 color: isCurrentPlan
 ? AppTheme.primary.withAlphaOpacity( 0.08)
 : AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(24),
 border: Border.all(
 color: isCurrentPlan ? AppTheme.primaryLight : AppTheme.borderOf(context),
 width: isCurrentPlan ? 2 : 1,
 ),
 ),
 child: Padding(
 padding: EdgeInsets.all(20),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Row(
 mainAxisAlignment: MainAxisAlignment.spaceBetween,
 children: [
 Expanded(
 child: Text(name,
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 18,
 fontWeight: FontWeight.w900,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 ),
 if (isCurrentPlan)
 Container(
 padding:
 EdgeInsets.symmetric(horizontal: 10, vertical: 4),
 decoration: BoxDecoration(
 color: AppTheme.success.withAlphaOpacity( 0.2),
 borderRadius: BorderRadius.circular(8),
 ),
 child: Text('CURRENT',
 style: TextStyle(
 color: AppTheme.success,
 fontSize: 10,
 fontWeight: FontWeight.w900,
 )),
 ),
 ],
 ),
 SizedBox(height: 8),
 Row(
 crossAxisAlignment: CrossAxisAlignment.end,
 children: [
 Text(
 '₹${(amountInr is num ? amountInr : num.tryParse(amountInr.toString()) ?? 0).toStringAsFixed(2)}',
 style: TextStyle(
 color: AppTheme.success,
 fontSize: 28,
 fontWeight: FontWeight.w900,
 ),
 ),
 SizedBox(width: 4),
 Padding(
 padding: EdgeInsets.only(bottom: 4),
 child: Text(
 '/ $interval${isLifetime ? ' (Lifetime)' : ''}',
 style: TextStyle(
 color: AppTheme.mutedOf(context), fontSize: 13),
 ),
 ),
 ],
 ),
 if (features.isNotEmpty) ...[
 SizedBox(height: 16),
 ...features.map((f) => Padding(
 padding: EdgeInsets.only(bottom: 6),
 child: Row(
 children: [
 Icon(Icons.check_circle_outline,
 color: AppTheme.primaryLight, size: 18),
 SizedBox(width: 8),
 Text(f,
 style: TextStyle(
 color: AppTheme.textSecondaryOf(context),
 fontSize: 13,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 ],
 ),
 )),
 ],
 SizedBox(height: 16),
 SizedBox(
 width: double.infinity,
 child: ElevatedButton(
 onPressed: isCurrentPlan || subscribing ? null : onSubscribe,
 style: ElevatedButton.styleFrom(
 backgroundColor:
 isCurrentPlan ? AppTheme.borderOf(context) : AppTheme.primary,
 disabledBackgroundColor: AppTheme.borderOf(context),
 padding: EdgeInsets.symmetric(vertical: 14),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(14),
 ),
 ),
 child: Text(
 isCurrentPlan
 ? 'Current Plan'
 : (subscribing ? 'Subscribing...' : 'Subscribe Now'),
 style: TextStyle(
 fontSize: 15,
 fontWeight: FontWeight.bold,
 color: AppTheme.surfaceOf(context),
 ),
 ),
 ),
 ),
 ],
 ),
 ),
 );
 }
}
