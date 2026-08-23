import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> item;
  final String itemType;
  final num amountInr;

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
  bool _disposed = false;

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
  bool _checkingCoupon = false;
  Map<String, dynamic>? _quote;
  String _quoteMessage = '';

  bool get _isNameValid => _nameCtrl.text.trim().isNotEmpty;
  bool get _isEmailValid => RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$').hasMatch(_emailCtrl.text.trim());
  bool get _isPhoneValid => _phoneCtrl.text.trim().length == 10 && RegExp(r'^[0-9]{10}$').hasMatch(_phoneCtrl.text.trim());
  bool get _isLine1Valid => _line1Ctrl.text.trim().isNotEmpty;
  bool get _isCityValid => _cityCtrl.text.trim().isNotEmpty;
  bool get _isStateValid => _stateCtrl.text.trim().isNotEmpty;
  bool get _isPincodeValid => _pincodeCtrl.text.trim().length == 6 && RegExp(r'^[0-9]{6}$').hasMatch(_pincodeCtrl.text.trim());

  bool get _isCreditFlow => widget.itemType == 'credit_pack';
  bool get _isEnrollmentFlow => widget.itemType == 'course' || widget.itemType == 'book';

  int get _finalAmountPaise {
    if (_quote != null) {
      return (_quote!['total_paise'] as num?)?.toInt() ?? (widget.amountInr * 100).toInt();
    }
    return (widget.amountInr * 100).toInt();
  }

  bool get _hasDiscount {
    final discount = (_quote?['discount_paise'] as num?)?.toInt() ?? 0;
    return discount > 0;
  }

  String _formatPaise(int paise) {
    if (paise % 100 == 0) return (paise ~/ 100).toString();
    return (paise / 100).toStringAsFixed(2);
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
    _disposed = true;
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
        final data = res.data;
        final user = data['user'] ?? data;
        _nameCtrl.text = user['full_name'] ?? '';
        _emailCtrl.text = user['email'] ?? '';
        _phoneCtrl.text = user['phone'] ?? '';
        _cityCtrl.text = user['district'] ?? '';
        _stateCtrl.text = user['state'] ?? '';
        _pincodeCtrl.text = user['pin_code'] ?? '';
      }
    } catch (e) {
      debugPrint('Prefill address failed: $e');
    }
    if (mounted) setState(() {});
  }

  Future<void> _applyCoupon() async {
    final code = _couponCtrl.text.trim().toUpperCase();
    if (code.isEmpty) return;

    setState(() {
      _checkingCoupon = true;
      _quoteMessage = '';
    });

    try {
      final itemId = widget.item['id']?.toString() ?? widget.item['course_id']?.toString() ?? 'ai-custom';
      final res = await ApiService.getQuote({
        'itemType': _isCreditFlow ? 'ai_credits' : widget.itemType,
        'itemId': itemId,
        'amount_paise': (widget.amountInr * 100).toInt(),
        'couponCode': code,
      });
      if (!mounted) return;
      final data = res.data;
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
      setState(() => _showAddress = true);
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
      dynamic response;
      if (_isCreditFlow) {
        response = await _createCreditOrder();
      } else if (_isEnrollmentFlow) {
        response = await _createEnrollmentOrder();
      } else {
        throw Exception('Invalid item type');
      }

      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = response.data;

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

        if (orderId.isEmpty || key.isEmpty) throw Exception('Invalid order response from server');

        final auth = Provider.of<AuthProvider>(context, listen: false);
        final user = auth.user;

        final amount = _finalAmountPaise;
        final options = {
          'key': key,
          'amount': amount,
          'name': 'Adityanveshan',
          'description': widget.item['title'] ?? widget.item['name'] ?? 'Purchase',
          'order_id': orderId,
          'prefill': {
            'contact': _phoneCtrl.text.isNotEmpty ? _phoneCtrl.text : (user?['phone'] ?? ''),
            'email': _emailCtrl.text.isNotEmpty ? _emailCtrl.text : (user?['email'] ?? ''),
          },
          'theme': {
            'color': '#${AppTheme.primaryHex}',
          },
        };

        setState(() => _status = 'Opening payment gateway...');
        _razorpay.open(options);
      } else {
        final errData = response.data;
        throw Exception(errData['error'] ?? 'Failed to create order');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _status = '';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment initiation failed: $e')),
        );
      }
    }
  }

  Future<dynamic> _createCreditOrder() async {
    final data = <String, dynamic>{'billingAddress': _billingAddressMap};
    if (widget.item['id'] != null) {
      data['pack_id'] = widget.item['id'].toString();
    } else {
      data['amount_paise'] = (widget.amountInr * 100).toInt();
    }
    if (_quote != null) {
      data['couponCode'] = _couponCtrl.text.trim().toUpperCase();
    }
    return await ApiService.createTopupOrder(data);
  }

  Future<dynamic> _createEnrollmentOrder() async {
    final itemId = (widget.item['id'] ?? widget.item['course_id'] ?? '').toString();
    final data = <String, dynamic>{
      'itemType': widget.itemType,
      'itemId': itemId,
      'billingAddress': _billingAddressMap,
    };
    if (_quote != null) {
      data['couponCode'] = _couponCtrl.text.trim().toUpperCase();
    }
    return await ApiService.createEnrollmentOrder(data);
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    if (_disposed) return;
    setState(() => _status = 'Verifying payment...');
    try {
      final orderId = response.orderId;
      final paymentId = response.paymentId;
      final signature = response.signature;
      if (orderId == null || paymentId == null || signature == null) {
        throw Exception('Payment verification failed: incomplete response from Razorpay');
      }
      final verifyPayload = {
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': signature,
      };

      final verifyResponse = _isCreditFlow
          ? await ApiService.verifyTopupPayment(verifyPayload)
          : await ApiService.verifyPayment(verifyPayload);

      if (verifyResponse.statusCode == 200) {
        if (_disposed || !mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment Successful!'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context, true);
      } else {
        final errData = verifyResponse.data;
        throw Exception(errData['error'] ?? 'Payment verification failed');
      }
    } catch (e) {
      if (_disposed || !mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment Verification Failed: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    } finally {
      if (!_disposed) setState(() { _isLoading = false; _status = ''; });
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (_disposed) return;
    setState(() { _isLoading = false; _status = ''; });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Payment Failed: ${response.message}'),
        backgroundColor: AppTheme.danger,
      ),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (_disposed) return;
    setState(() { _isLoading = false; _status = ''; });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External Wallet selected: ${response.walletName}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCustomAmount = widget.item['id'] == null;

    return Scaffold(
      backgroundColor: AppTheme.backgroundOf(context),
      appBar: AppBar(
        title: Text(
          'Checkout',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimaryOf(context)),
        ),
        backgroundColor: AppTheme.backgroundOf(context),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isDesktop = constraints.maxWidth > 800;
            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: isDesktop ? 1200 : 800),
                child: Column(
                  children: [
                    Expanded(
                      child: isDesktop
                          ? Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  flex: 6,
                                  child: ListView(
                                    padding: const EdgeInsets.all(AppTheme.space5),
                                    children: [
                                      _buildOrderSummary(isCustomAmount),
                                      const SizedBox(height: AppTheme.space5),
                                      _buildBillingAddress(),
                                    ],
                                  ),
                                ),
                                VerticalDivider(width: 1, color: AppTheme.borderOf(context)),
                                Expanded(
                                  flex: 4,
                                  child: ListView(
                                    padding: const EdgeInsets.all(AppTheme.space5),
                                    children: [
                                      _buildCouponSection(),
                                      const SizedBox(height: AppTheme.space5),
                                      _buildPriceSummary(),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView(
                              padding: const EdgeInsets.all(AppTheme.space4),
                              children: [
                                _buildOrderSummary(isCustomAmount),
                                const SizedBox(height: AppTheme.space5),
                                _buildBillingAddress(),
                                const SizedBox(height: AppTheme.space5),
                                _buildCouponSection(),
                                const SizedBox(height: AppTheme.space5),
                                _buildPriceSummary(),
                              ],
                            ),
                    ),
                    _buildBottomBar(),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildOrderSummary(bool isCustomAmount) {
    return YuvaCard(
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppTheme.premiumGradient,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: const Icon(Icons.shopping_bag_rounded, color: AppTheme.surface, size: 28),
          ),
          const SizedBox(width: AppTheme.space4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.item['title'] ?? widget.item['name'] ?? 'Item Purchase',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 17,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space1),
                if (isCustomAmount)
                  Text(
                    '₹${widget.amountInr.toStringAsFixed(2)} • Wallet Top-up',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppTheme.primary,
                          fontSize: 14,
                        ),
                  )
                else
                  Text(
                    widget.itemType.toUpperCase().replaceAll('_', ' '),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.mutedOf(context),
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
    return YuvaCard(
      padding: const EdgeInsets.all(AppTheme.space2),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _showAddress = !_showAddress),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.space3),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withAlphaOpacity(0.1),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    child: const Icon(Icons.location_on_outlined, color: AppTheme.primary),
                  ),
                  const SizedBox(width: AppTheme.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Billing Address',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                color: AppTheme.textPrimaryOf(context),
                                fontSize: 16,
                              ),
                        ),
                        const SizedBox(height: AppTheme.space1),
                        Text(
                          _billingComplete ? 'Complete' : 'Required for this purchase',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: _billingComplete ? AppTheme.success : AppTheme.mutedOf(context),
                              ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _showAddress ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: AppTheme.mutedOf(context),
                  ),
                ],
              ),
            ),
          ),
          if (_showAddress)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppTheme.space3, 0, AppTheme.space3, AppTheme.space3),
              child: Column(
                children: [
                  _Field(controller: _nameCtrl, label: 'Naam (Full name) *', isValid: _isNameValid, showError: _showAddress, onChanged: (_) => setState(() {}),),
                  const SizedBox(height: AppTheme.space3),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          controller: _emailCtrl,
                          label: 'Email *',
                          keyboardType: TextInputType.emailAddress,
                          isValid: _isEmailValid,
                          showError: _showAddress,
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: AppTheme.space3),
                      Expanded(
                        child: _Field(
                          controller: _phoneCtrl,
                          label: 'Phone *',
                          keyboardType: TextInputType.phone,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          maxLength: 10,
                          isValid: _isPhoneValid,
                          showError: _showAddress,
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppTheme.space3),
                  _Field(controller: _line1Ctrl, label: 'Address line 1 *', isValid: _isLine1Valid, showError: _showAddress, onChanged: (_) => setState(() {}),),
                  const SizedBox(height: AppTheme.space3),
                  _Field(controller: _line2Ctrl, label: 'Address line 2', onChanged: (_) => setState(() {}),),
                  const SizedBox(height: AppTheme.space3),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          controller: _cityCtrl,
                          label: 'City *',
                          isValid: _isCityValid,
                          showError: _showAddress,
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: AppTheme.space3),
                      Expanded(
                        child: _Field(
                          controller: _stateCtrl,
                          label: 'State *',
                          isValid: _isStateValid,
                          showError: _showAddress,
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppTheme.space3),
                  _Field(
                    controller: _pincodeCtrl,
                    label: 'PIN Code *',
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    maxLength: 6,
                    isValid: _isPincodeValid,
                    showError: _showAddress,
                    onChanged: (_) => setState(() {}),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCouponSection() {
    return YuvaCard(
      side: BorderSide(color: _hasDiscount ? AppTheme.success : AppTheme.borderOf(context)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_offer_outlined, color: AppTheme.primary, size: 20),
              const SizedBox(width: AppTheme.space2),
              Text(
                'Coupon Code',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppTheme.textPrimaryOf(context),
                      fontSize: 15,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.space3),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _couponCtrl,
                  textCapitalization: TextCapitalization.characters,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        letterSpacing: 1.5,
                        fontSize: 14,
                      ),
                  decoration: _inputDecoration('Enter coupon code'),
                  onChanged: (_) {
                    if (_quote != null) setState(() { _quote = null; _quoteMessage = ''; });
                  },
                ),
              ),
              const SizedBox(width: AppTheme.space3),
              SizedBox(
                height: 48,
                child: YuvaButton.primary(
                  label: 'Apply',
                  onPressed: _couponCtrl.text.trim().isEmpty ? null : _applyCoupon,
                  isLoading: _checkingCoupon,
                  height: 48,
                ),
              ),
            ],
          ),
          if (_quoteMessage.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppTheme.space2),
              child: Text(
                _quoteMessage,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: _hasDiscount ? AppTheme.success : AppTheme.danger,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceSummary() {
    final discount = (_quote?['discount_paise'] as num?)?.toInt() ?? 0;
    final total = _finalAmountPaise;

    return YuvaCard(
      child: Column(
        children: [
          _priceRow('Subtotal', '₹${_formatPaise((widget.amountInr * 100).toInt())}'),
          if (_hasDiscount) ...[
            const SizedBox(height: AppTheme.space2),
            _priceRow('Discount', '- ₹${_formatPaise(discount)}', valueColor: AppTheme.success),
          ],
          Divider(color: AppTheme.borderOf(context), height: 24),
          _priceRow(
            'Total',
            '₹${_formatPaise(total)}',
            titleWeight: FontWeight.w800,
            valueSize: 24,
            valueWeight: FontWeight.w900,
            valueColor: AppTheme.success,
          ),
        ],
      ),
    );
  }

  Widget _priceRow(
    String label,
    String value, {
    Color? valueColor,
    FontWeight titleWeight = FontWeight.normal,
    double valueSize = 16,
    FontWeight valueWeight = FontWeight.w700,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.mutedOf(context),
                fontWeight: titleWeight,
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: valueColor ?? AppTheme.textPrimaryOf(context),
                fontSize: valueSize,
                fontWeight: valueWeight,
              ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(AppTheme.space4, 12, AppTheme.space4, AppTheme.space4),
      decoration: BoxDecoration(
        color: AppTheme.surfaceOf(context),
        border: Border(top: BorderSide(color: AppTheme.borderOf(context))),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: YuvaButton.primary(
          label: _isLoading
              ? _status
              : (_finalAmountPaise == 0 ? 'Free • Confirm Order' : 'Pay ₹${_formatPaise(_finalAmountPaise)}'),
          onPressed: _isLoading ? null : _startPayment,
          isLoading: _isLoading,
          height: 56,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, {String? errorText}) {
    return InputDecoration(
      hintText: label,
      hintStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondaryOf(context)),
      filled: true,
      fillColor: AppTheme.elevatedOf(context),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        borderSide: BorderSide(color: AppTheme.primary),
      ),
      errorText: errorText,
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        borderSide: const BorderSide(color: AppTheme.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        borderSide: const BorderSide(color: AppTheme.danger, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.space3, vertical: AppTheme.space3),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;
  final bool isValid;
  final bool showError;
  final ValueChanged<String>? onChanged;

  const _Field({
    required this.controller,
    required this.label,
    this.keyboardType,
    this.inputFormatters,
    this.maxLength,
    this.isValid = true,
    this.showError = false,
    this.onChanged,
  });

  String? get _errorText {
    if (!showError) return null;
    if (isValid) return null;
    return '$label invalid';
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLength: maxLength,
      buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppTheme.textPrimaryOf(context),
            fontWeight: FontWeight.w600,
          ),
      decoration: InputDecoration(
        hintText: label,
        hintStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondaryOf(context)),
        filled: true,
        fillColor: AppTheme.elevatedOf(context),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          borderSide: BorderSide(color: AppTheme.primary),
        ),
        errorText: _errorText,
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          borderSide: const BorderSide(color: AppTheme.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          borderSide: const BorderSide(color: AppTheme.danger, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: AppTheme.space3, vertical: AppTheme.space3),
      ),
      onChanged: onChanged,
    );
  }
}