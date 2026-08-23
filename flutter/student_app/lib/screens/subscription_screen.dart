import 'dart:async';
import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../services/api_service.dart';
import '../services/real_time_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';

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
    _realtimeSub = RealTimeService.instance.dataStream.listen((event) async {
      if (!mounted) return;
      if (event['entity'] == 'subscription') {
        await _fetchDataQuietly();
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

  Future<void> _fetchDataQuietly() async {
    try {
      final results = await Future.wait([
        ApiService.getSubscriptionPlans(),
        ApiService.getUserSubscription(),
      ]);
      if (!mounted) return;
      if (results[0].statusCode == 200) {
        final plansData = results[0].data;
        setState(() => _plans = plansData['plans'] ?? []);
      }
      if (results[1].statusCode == 200) {
        final subData = results[1].data;
        setState(() => _mySub = subData['subscription']);
      }
    } catch (e) {
      debugPrint('Subscription quiet refresh failed: $e');
    }
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
        setState(() => _plans = plansData['plans'] ?? []);
      }
      if (results[1].statusCode == 200) {
        final subData = results[1].data;
        setState(() => _mySub = subData['subscription']);
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
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
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
      SnackBar(content: Text('External Wallet: ${response.walletName}')),
    );
  }

  Future<void> _cancelSubscription() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceOf(context),
        title: Text(
          'Cancel Subscription?',
          style: Theme.of(ctx).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimaryOf(context)),
        ),
        content: Text(
          'Aapka subscription cancel ho jayega. Current period end tak access rahega.',
          style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondaryOf(context)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Back', style: TextStyle(color: AppTheme.mutedOf(context))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Confirm Cancel', style: TextStyle(color: AppTheme.surface)),
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
            const SnackBar(
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
      backgroundColor: AppTheme.backgroundOf(context),
      appBar: AppBar(
        title: Text(
          'Subscription Plans',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimaryOf(context)),
        ),
        backgroundColor: AppTheme.backgroundOf(context),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        child: ResponsiveLayout(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : _error != null
                  ? _SubscriptionError(message: _error!, onRetry: _fetchData)
                  : RefreshIndicator(
                      onRefresh: _fetchData,
                      color: AppTheme.primary,
                      backgroundColor: AppTheme.surfaceOf(context),
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          if (_mySub != null)
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(AppTheme.space4, AppTheme.space2, AppTheme.space4, 0),
                                child: _CurrentSubscriptionCard(
                                  subscription: _mySub!,
                                  cancelling: _cancelling,
                                  onCancel: _cancelSubscription,
                                ),
                              ),
                            ),
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, AppTheme.space5, AppTheme.space4, AppTheme.space3),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Available Plans',
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          color: AppTheme.textPrimaryOf(context),
                                          fontSize: 22,
                                        ),
                                  ),
                                  const SizedBox(height: AppTheme.space1),
                                  Text(
                                    'Ek plan select karein jo aapki zarooraton ke liye sahi ho.',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: AppTheme.mutedOf(context),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (_plans.isEmpty)
                            SliverToBoxAdapter(
                              child: Center(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 80),
                                  child: YuvaEmptyState.noData(
                                    title: 'No subscription plans',
                                    subtitle: 'Abhi koi subscription plan available nahi hai.',
                                  ),
                                ),
                              ),
                            )
                          else
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space6),
                              sliver: SliverList.separated(
                                itemCount: _plans.length,
                                separatorBuilder: (_, __) => const SizedBox(height: AppTheme.space4),
                                itemBuilder: (context, index) {
                                  final plan = _plans[index] is Map<String, dynamic>
                                      ? _plans[index] as Map<String, dynamic>
                                      : <String, dynamic>{};
                                  final isCurrentPlan = _mySub?['plan_id'] == plan['id'];
                                  return SubscriptionPlanCard(
                                    plan: plan,
                                    isCurrentPlan: isCurrentPlan,
                                    subscribing: _subscribing,
                                    index: index,
                                    onSubscribe: isCurrentPlan ? null : () => _subscribe(plan['id'].toString()),
                                  );
                                },
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

class _CurrentSubscriptionCard extends StatelessWidget {
  final Map<String, dynamic> subscription;
  final bool cancelling;
  final VoidCallback onCancel;

  const _CurrentSubscriptionCard({
    required this.subscription,
    required this.cancelling,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final status = subscription['status'] ?? '';
    final planName = subscription['plan_name'] ?? 'Subscription';
    final interval = subscription['interval'] ?? '';

    return Container(
      padding: const EdgeInsets.all(AppTheme.space5),
      decoration: BoxDecoration(
        gradient: AppTheme.auroraGradient,
        borderRadius: BorderRadius.circular(AppTheme.radius2Xl),
        boxShadow: AppTheme.mediumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_rounded, color: AppTheme.surface, size: 20),
              const SizedBox(width: AppTheme.space2),
              Text(
                status == 'active' ? 'ACTIVE' : status.toUpperCase(),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppTheme.surface,
                      letterSpacing: 1.5,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.space4),
          Text(
            'Current Plan',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.surface.withAlphaOpacity(0.85),
                ),
          ),
          const SizedBox(height: AppTheme.space1),
          Text(
            planName,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppTheme.surface,
                  fontSize: 24,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (interval.isNotEmpty) ...[
            const SizedBox(height: AppTheme.space1),
            Text(
              interval,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.surface.withAlphaOpacity(0.7),
                  ),
            ),
          ],
          const SizedBox(height: AppTheme.space5),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: cancelling ? null : onCancel,
              icon: cancelling
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.surface),
                    )
                  : const Icon(Icons.cancel_outlined, size: 18),
              label: Text(cancelling ? 'Cancelling...' : 'Cancel Subscription'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.surface,
                backgroundColor: AppTheme.surface.withAlphaOpacity(0.2),
                side: BorderSide(color: AppTheme.surface.withAlphaOpacity(0.3)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
                textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppTheme.surface,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionError extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _SubscriptionError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space6),
        child: YuvaEmptyState.error(
          title: message,
          actionLabel: 'Try Again',
          onAction: onRetry,
        ),
      ),
    );
  }
}