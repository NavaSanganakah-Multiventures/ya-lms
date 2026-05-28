import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> item; // Course or Subscription details
  final String itemType; // 'course', 'subscription', 'credit_pack'
  final int amountInr;

  const CheckoutScreen({
    super.key,
    required this.item,
    required this.itemType,
    required this.amountInr,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  late Razorpay _razorpay;
  bool _isLoading = false;
  String _status = '';

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _startPayment() async {
    setState(() {
      _isLoading = true;
      _status = 'Creating order...';
    });

    try {
      final itemId = (widget.item['id'] ?? widget.item['course_id'] ?? '').toString();
      final response = await ApiService.createRazorpayOrder(widget.itemType, itemId, widget.amountInr);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final orderId = data['order']?['id'] ?? data['id']; // Depends on backend response structure
        final key = data['key'] ?? ''; // Backend should send razorpay key

        if (orderId == null || key.isEmpty) {
          throw Exception('Invalid order response from server');
        }

        final auth = Provider.of<AuthProvider>(context, listen: false);
        final user = auth.user;

        var options = {
          'key': key,
          'amount': widget.amountInr * 100, // amount in paise
          'name': 'Adityanveshan',
          'description': widget.item['title'] ?? 'Purchase',
          'order_id': orderId,
          'prefill': {
            'contact': user?['phone'] ?? '',
            'email': user?['email'] ?? '',
          },
          'theme': {
            'color': '#EA580C', // AppTheme.primary
          }
        };

        setState(() {
          _status = 'Opening payment gateway...';
        });
        
        _razorpay.open(options);
      } else {
        throw Exception('Failed to create order');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _status = '';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment initiation failed: $e')),
      );
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    setState(() {
      _status = 'Verifying payment...';
    });

    try {
      final verifyResponse = await ApiService.verifyRazorpayPayment({
        'razorpay_order_id': response.orderId,
        'razorpay_payment_id': response.paymentId,
        'razorpay_signature': response.signature,
      });

      if (verifyResponse.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment Successful!'), backgroundColor: AppTheme.success),
        );
        Navigator.pop(context, true); // Return true indicating success
      } else {
        throw Exception('Payment verification failed');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment Verification Failed: $e'), backgroundColor: AppTheme.danger),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _status = '';
        });
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    setState(() {
      _isLoading = false;
      _status = '';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment Failed: ${response.message}'), backgroundColor: AppTheme.danger),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External Wallet selected: ${response.walletName}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Order Summary', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shopping_bag_rounded, color: AppTheme.primaryLight, size: 40),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.item['title'] ?? 'Item Purchase', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(widget.itemType.toUpperCase(), style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount', style: TextStyle(color: AppTheme.muted, fontSize: 16)),
                  Text('₹${widget.amountInr}', style: const TextStyle(color: AppTheme.success, fontSize: 24, fontWeight: FontWeight.bold)),
                ],
              ),
              const Spacer(),
              if (_isLoading)
                Center(
                  child: Column(
                    children: [
                      const CircularProgressIndicator(color: AppTheme.primaryLight),
                      const SizedBox(height: 12),
                      Text(_status, style: const TextStyle(color: AppTheme.mutedSoft)),
                    ],
                  ),
                )
              else
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _startPayment,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Proceed to Pay', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
