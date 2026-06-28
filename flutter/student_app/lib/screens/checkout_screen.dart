import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> item;
  final String itemType;
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

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _line1Ctrl = TextEditingController();
  final _line2Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();
  final _couponCtrl = TextEditingController();

  bool _showAddress = false;
  bool _addressPrefilled = false;

  bool _checkingCoupon = false;
  Map<String, dynamic>? _quote;
  String _quoteMessage = '';

  bool get _isCreditFlow =>
      widget.itemType == 'credit_pack';

  bool get _isEnrollmentFlow =>
      widget.itemType == 'course' || widget.itemType == 'book';

  int get _finalAmountPaise {
    if (_quote != null) {
      return (_quote!['total_paise'] as num?)?.toInt() ?? widget.amountInr * 100;
    }
    return widget.amountInr * 100;
  }

  bool get _hasDiscount {
    final discount = (_quote?['discount_paise'] as num?)?.toInt() ?? 0;
    return discount > 0;
  }

  Map<String, String> get _billingAddressMap => {
        'full_name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'line1': _line1Ctrl.text.trim(),
        'line2': _line2Ctrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'state': _stateCtrl.text.trim(),
        'pincode': _pincodeCtrl.text.trim(),
        'country': 'India',
      };

  bool get _billingComplete =>
      _nameCtrl.text.trim().isNotEmpty &&
      _emailCtrl.text.trim().isNotEmpty &&
      _emailCtrl.text.contains('@') &&
      _phoneCtrl.text.trim().length >= 10 &&
      _line1Ctrl.text.trim().isNotEmpty &&
      _cityCtrl.text.trim().isNotEmpty &&
      _stateCtrl.text.trim().isNotEmpty &&
      _pincodeCtrl.text.trim().length >= 4;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _prefillAddress();
  }

  @override
  void dispose() {
    _razorpay.clear();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _line1Ctrl.dispose();
    _line2Ctrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    _couponCtrl.dispose();
    super.dispose();
  }

  Future<void> _prefillAddress() async {
    try {
      final res = await ApiService.getProfile();
      if (res.statusCode == 200 && mounted) {
        final data = jsonDecode(res.body);
        final user = data['user'] ?? data;
        _nameCtrl.text = user['full_name'] ?? '';
        _emailCtrl.text = user['email'] ?? '';
        _phoneCtrl.text = user['phone'] ?? '';
        _cityCtrl.text = user['district'] ?? '';
        _stateCtrl.text = user['state'] ?? '';
        _pincodeCtrl.text = user['pin_code'] ?? '';
        _addressPrefilled = true;
      }
    } catch (_) {}
  }

  Future<void> _applyCoupon() async {
    final code = _couponCtrl.text.trim().toUpperCase();
    if (code.isEmpty) return;

    setState(() {
      _checkingCoupon = true;
      _quoteMessage = '';
    });

    try {
      final itemId = widget.item['id']?.toString() ??
          widget.item['course_id']?.toString() ??
          'ai-custom';

      final res = await http
          .post(
            Uri.parse('${ApiService.baseUrl}/api/checkout/quote'),
            headers: await ApiService.getHeaders(),
            body: jsonEncode({
              'itemType': _isCreditFlow ? 'ai_credits' : widget.itemType,
              'itemId': itemId,
              'amount_paise': widget.amountInr * 100,
              'couponCode': code,
            }),
          )
          .timeout(const Duration(seconds: 15));

      if (mounted) {
        final data = jsonDecode(res.body);
        if (res.statusCode == 200) {
          setState(() {
            _quote = data['quote'];
            _quoteMessage = data['quote']?['message'] ??
                (_hasDiscount ? 'Coupon apply ho gaya!' : 'Coupon valid hai.');
          });
        } else {
          setState(() {
            _quote = null;
            _quoteMessage = data['error'] ?? 'Coupon valid nahi hai';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _quote = null;
          _quoteMessage = 'Coupon check fail: $e';
        });
      }
    } finally {
      if (mounted) setState(() => _checkingCoupon = false);
    }
  }

  Future<void> _startPayment() async {
    if (_isEnrollmentFlow && !_billingComplete) {
      _showAddress = true;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Kripya billing address bharein'),
          backgroundColor: AppTheme.danger,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _status = 'Creating order...';
    });

    try {
      http.Response response;

      if (_isCreditFlow) {
        response = await _createCreditOrder();
      } else if (_isEnrollmentFlow) {
        response = await _createEnrollmentOrder();
      } else {
        throw Exception('Invalid item type');
      }

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['freeCheckout'] == true) {
          setState(() {
            _isLoading = false;
            _status = '';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment Successful!'),
              backgroundColor: AppTheme.success,
            ),
          );
          Navigator.pop(context, true);
          return;
        }

        String orderId;
        String key;

        if (_isCreditFlow) {
          orderId = data['order_id'] ?? data['order']?['id'] ?? data['id'] ?? '';
          key = data['key_id'] ?? data['key'] ?? '';
        } else {
          orderId = data['order']?['id'] ?? data['order_id'] ?? '';
          key = data['key'] ?? data['key_id'] ?? '';
        }

        if (orderId.isEmpty || key.isEmpty) {
          throw Exception('Invalid order response from server');
        }

        final auth = Provider.of<AuthProvider>(context, listen: false);
        final user = auth.user;

        final amount = _finalAmountPaise;
        final options = {
          'key': key,
          'amount': amount,
          'name': 'Adityanveshan',
          'description':
              widget.item['title'] ?? widget.item['name'] ?? 'Purchase',
          'order_id': orderId,
          'prefill': {
            'contact': _phoneCtrl.text.isNotEmpty
                ? _phoneCtrl.text
                : (user?['phone'] ?? ''),
            'email': _emailCtrl.text.isNotEmpty
                ? _emailCtrl.text
                : (user?['email'] ?? ''),
          },
          'theme': {
            'color':
                '#${AppTheme.primary.toARGB32().toRadixString(16).substring(2, 8).toUpperCase()}',
          },
        };

        setState(() => _status = 'Opening payment gateway...');
        _razorpay.open(options);
      } else {
        final errData = jsonDecode(response.body);
        throw Exception(errData['error'] ?? 'Failed to create order');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _status = '';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment initiation failed: $e')),
        );
      }
    }
  }

  Future<http.Response> _createCreditOrder() async {
    final body = <String, dynamic>{
      'billingAddress': _billingAddressMap,
    };

    if (widget.item['id'] != null) {
      body['pack_id'] = widget.item['id'].toString();
    } else {
      body['amount_paise'] = widget.amountInr * 100;
      body['credits'] = widget.item['credits'] ?? 0;
      body['credit_type'] = widget.item['credit_type'] ?? 'ai';
    }

    if (_quote != null) {
      body['couponCode'] = _couponCtrl.text.trim().toUpperCase();
    }

    return http
        .post(
          Uri.parse('${ApiService.baseUrl}/api/razorpay/create-credits-order'),
          headers: await ApiService.getHeaders(),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));
  }

  Future<http.Response> _createEnrollmentOrder() async {
    final itemId = (widget.item['id'] ?? widget.item['course_id'] ?? '').toString();

    final body = <String, dynamic>{
      'itemType': widget.itemType,
      'itemId': itemId,
      'billingAddress': _billingAddressMap,
    };

    if (_quote != null) {
      body['couponCode'] = _couponCtrl.text.trim().toUpperCase();
    }

    return http
        .post(
          Uri.parse('${ApiService.baseUrl}/api/payments/create-order'),
          headers: await ApiService.getHeaders(),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    setState(() => _status = 'Verifying payment...');

    try {
      final verifyPayload = {
        'razorpay_order_id': response.orderId,
        'razorpay_payment_id': response.paymentId,
        'razorpay_signature': response.signature,
      };

      final verifyUrl = _isCreditFlow
          ? '${ApiService.baseUrl}/api/razorpay/verify-credits-payment'
          : '${ApiService.baseUrl}/api/payments/verify';

      final verifyResponse = await http
          .post(
            Uri.parse(verifyUrl),
            headers: await ApiService.getHeaders(),
            body: jsonEncode(verifyPayload),
          )
          .timeout(const Duration(seconds: 15));

      if (verifyResponse.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment Successful!'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context, true);
      } else {
        final errData = jsonDecode(verifyResponse.body);
        throw Exception(errData['error'] ?? 'Payment verification failed');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment Verification Failed: $e'),
          backgroundColor: AppTheme.danger,
        ),
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
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment Failed: ${response.message}'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('External Wallet selected: ${response.walletName}'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCustomAmount =
        widget.item['id'] == null && widget.item['credit_type'] != null;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: ResponsiveLayout(
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    _buildOrderSummary(isCustomAmount),
                    const SizedBox(height: 24),
                    _buildBillingAddress(),
                    const SizedBox(height: 20),
                    _buildCouponSection(),
                    const SizedBox(height: 20),
                    _buildPriceSummary(),
                  ],
                ),
              ),
              _buildBottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderSummary(bool isCustomAmount) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.shopping_bag_rounded,
            color: AppTheme.primaryLight,
            size: 40,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.item['title'] ??
                      widget.item['name'] ??
                      'Item Purchase',
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                if (isCustomAmount)
                  Text(
                    '${widget.item['credits'] ?? 0} ${widget.item['credit_type'] ?? ''} Credits',
                    style: const TextStyle(
                      color: AppTheme.primaryLight,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                else
                  Text(
                    widget.itemType.toUpperCase().replaceAll('_', ' '),
                    style: const TextStyle(
                      color: AppTheme.muted,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingAddress() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _showAddress = !_showAddress),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined,
                      color: AppTheme.primaryLight),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Billing Address',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  Icon(
                    _showAddress
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: AppTheme.muted,
                  ),
                ],
              ),
            ),
          ),
          if (_showAddress)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                children: [
                  TextField(
                    controller: _nameCtrl,
                    decoration: _inputDecoration('Naam (Full name) *'),
                    style: _inputStyle(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          decoration: _inputDecoration('Email *'),
                          style: _inputStyle(),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _phoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: _inputDecoration('Phone *'),
                          style: _inputStyle(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _line1Ctrl,
                    decoration: _inputDecoration('Address line 1 *'),
                    style: _inputStyle(),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _line2Ctrl,
                    decoration: _inputDecoration('Address line 2'),
                    style: _inputStyle(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _cityCtrl,
                          decoration: _inputDecoration('City *'),
                          style: _inputStyle(),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _stateCtrl,
                          decoration: _inputDecoration('State *'),
                          style: _inputStyle(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _pincodeCtrl,
                    keyboardType: TextInputType.number,
                    decoration: _inputDecoration('PIN Code *'),
                    style: _inputStyle(),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCouponSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _hasDiscount ? AppTheme.success : AppTheme.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.local_offer_outlined, color: AppTheme.primaryLight, size: 18),
              SizedBox(width: 8),
              Text(
                'Coupon Code',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _couponCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: 'Enter coupon code',
                    hintStyle:
                        const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                    filled: true,
                    fillColor: AppTheme.elevated,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 44,
                child: ElevatedButton(
                  onPressed:
                      _couponCtrl.text.trim().isEmpty ? null : _applyCoupon,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    disabledBackgroundColor: AppTheme.border,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _checkingCoupon
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.surface,
                          ),
                        )
                      : const Text('Apply',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.surface,
                          )),
                ),
              ),
            ],
          ),
          if (_quoteMessage.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _quoteMessage,
                style: TextStyle(
                  color: _hasDiscount ? AppTheme.success : AppTheme.danger,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceSummary() {
    final subtotal = widget.amountInr * 100;
    final discount = (_quote?['discount_paise'] as num?)?.toInt() ?? 0;
    final total = _finalAmountPaise;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          _priceRow('Subtotal', '₹${(subtotal / 100).toStringAsFixed(0)}'),
          if (_hasDiscount) ...[
            const SizedBox(height: 8),
            _priceRow('Discount',
                '- ₹${(discount / 100).toStringAsFixed(0)}',
                valueColor: AppTheme.success),
          ],
          const Divider(color: AppTheme.border, height: 24),
          _priceRow('Total', '₹${(total / 100).toStringAsFixed(0)}',
              titleWeight: FontWeight.bold,
              valueSize: 22,
              valueWeight: FontWeight.w900,
              valueColor: AppTheme.success),
        ],
      ),
    );
  }

  Widget _priceRow(String label, String value,
      {Color? valueColor,
      FontWeight titleWeight = FontWeight.normal,
      double valueSize = 16,
      FontWeight valueWeight = FontWeight.bold}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                color: AppTheme.muted,
                fontSize: 14,
                fontWeight: titleWeight)),
        Text(value,
            style: TextStyle(
              color: valueColor ?? AppTheme.textPrimary,
              fontSize: valueSize,
              fontWeight: valueWeight,
            )),
      ],
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: _isLoading ? null : _startPayment,
          style: ElevatedButton.styleFrom(
            backgroundColor: _finalAmountPaise == 0
                ? AppTheme.success
                : AppTheme.primary,
            disabledBackgroundColor: AppTheme.border,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _isLoading
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTheme.surface,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _status,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.surface,
                      ),
                    ),
                  ],
                )
              : Text(
                  _finalAmountPaise == 0
                      ? 'Free • Confirm Order'
                      : 'Pay ₹${(_finalAmountPaise / 100).toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.surface,
                  ),
                ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      hintText: label,
      hintStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
      filled: true,
      fillColor: AppTheme.elevated,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  TextStyle _inputStyle() {
    return const TextStyle(
      color: AppTheme.textPrimary,
      fontSize: 15,
    );
  }
}
