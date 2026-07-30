import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class CheckoutScreen extends StatefulWidget {
 final Map<String, dynamic> item;
 final String itemType;
 final num amountInr;

 CheckoutScreen({
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

 bool get _isCreditFlow =>
 widget.itemType == 'credit_pack';

 bool get _isEnrollmentFlow =>
 widget.itemType == 'course' || widget.itemType == 'book';

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
 if (paise % 100 == 0) {
 return (paise ~/ 100).toString();
 }
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
 final itemId = widget.item['id']?.toString() ??
 widget.item['course_id']?.toString() ??
 'ai-custom';

 final res = await ApiService.getQuote({
    'itemType': _isCreditFlow ? 'ai_credits' : widget.itemType,
 'itemId': itemId,
 'amount_paise': (widget.amountInr * 100).toInt(),
 'couponCode': code,
 });

 if (mounted) {
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
 setState(() { _showAddress = true; });
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
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
 SnackBar(
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
 final data = <String, dynamic>{
 'billingAddress': _billingAddressMap,
 };

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
 SnackBar(
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
 if (!_disposed) {
 setState(() {
 _isLoading = false;
 _status = '';
 });
 }
 }
 }

 void _handlePaymentError(PaymentFailureResponse response) {
 if (_disposed) return;
 setState(() {
 _isLoading = false;
 _status = '';
 });
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Payment Failed: ${response.message}'),
 backgroundColor: AppTheme.danger,
 ),
 );
 }

 void _handleExternalWallet(ExternalWalletResponse response) {
 if (_disposed) return;
 setState(() {
 _isLoading = false;
 _status = '';
 });
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('External Wallet selected: ${response.walletName}'),
 ),
 );
 }

 @override
 Widget build(BuildContext context) {
 final isCustomAmount = widget.item['id'] == null;

 return Scaffold(
 appBar: AppBar(title: Text('Checkout')),
 backgroundColor: AppTheme.backgroundOf(context),
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
 padding: EdgeInsets.all(24),
 children: [
 _buildOrderSummary(isCustomAmount),
 SizedBox(height: 24),
 _buildBillingAddress(),
 ],
 ),
 ),
 Container(width: 1, color: AppTheme.borderOf(context)),
 Expanded(
 flex: 4,
 child: ListView(
 padding: EdgeInsets.all(24),
 children: [
 _buildCouponSection(),
 SizedBox(height: 20),
 _buildPriceSummary(),
 ],
 ),
 ),
 ],
 )
 : ListView(
 padding: EdgeInsets.all(24),
 children: [
 _buildOrderSummary(isCustomAmount),
 SizedBox(height: 24),
 _buildBillingAddress(),
 SizedBox(height: 20),
 _buildCouponSection(),
 SizedBox(height: 20),
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
 return Container(
 padding: EdgeInsets.all(20),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 children: [
 Icon(
 Icons.shopping_bag_rounded,
 color: AppTheme.primaryLight,
 size: 40,
 ),
 SizedBox(width: 16),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 widget.item['title'] ??
 widget.item['name'] ??
 'Item Purchase',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 18,
 fontWeight: FontWeight.w600,
 ),
 maxLines: 2,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 4),
 if (isCustomAmount)
 Text(
 '₹${widget.amountInr.toStringAsFixed(2)} • Wallet Top-up',
 style: TextStyle(
 color: AppTheme.primaryLight,
 fontSize: 14,
 fontWeight: FontWeight.bold,
 ),
 )
 else
 Text(
 widget.itemType.toUpperCase().replaceAll('_', ' '),
 style: TextStyle(
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
 return Container(
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Column(
 children: [
 InkWell(
 onTap: () => setState(() => _showAddress = !_showAddress),
 borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
 child: Padding(
 padding: EdgeInsets.all(20),
 child: Row(
 children: [
 Icon(Icons.location_on_outlined,
 color: AppTheme.primaryLight),
 SizedBox(width: 12),
 Expanded(
 child: Text(
 'Billing Address',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 16,
 ),
 ),
 ),
 Icon(
 _showAddress
 ? Icons.keyboard_arrow_up
 : Icons.keyboard_arrow_down,
 color: AppTheme.mutedOf(context),
 ),
 ],
 ),
 ),
 ),
 if (_showAddress)
 Padding(
 padding: EdgeInsets.fromLTRB(20, 0, 20, 20),
 child: Column(
 children: [
 TextField(
 controller: _nameCtrl,
 decoration: _inputDecoration('Naam (Full name) *'),
 style: _inputStyle(),
 ),
 SizedBox(height: 12),
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
 SizedBox(width: 12),
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
 SizedBox(height: 12),
 TextField(
 controller: _line1Ctrl,
 decoration: _inputDecoration('Address line 1 *'),
 style: _inputStyle(),
 ),
 SizedBox(height: 12),
 TextField(
 controller: _line2Ctrl,
 decoration: _inputDecoration('Address line 2'),
 style: _inputStyle(),
 ),
 SizedBox(height: 12),
 Row(
 children: [
 Expanded(
 child: TextField(
 controller: _cityCtrl,
 decoration: _inputDecoration('City *'),
 style: _inputStyle(),
 ),
 ),
 SizedBox(width: 12),
 Expanded(
 child: TextField(
 controller: _stateCtrl,
 decoration: _inputDecoration('State *'),
 style: _inputStyle(),
 ),
 ),
 ],
 ),
 SizedBox(height: 12),
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
 padding: EdgeInsets.all(20),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(
 color: _hasDiscount ? AppTheme.success : AppTheme.borderOf(context),
 ),
 ),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Row(
 children: [
 Icon(Icons.local_offer_outlined, color: AppTheme.primaryLight, size: 18),
 SizedBox(width: 8),
 Text(
 'Coupon Code',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 15,
 ),
 ),
 ],
 ),
 SizedBox(height: 12),
 Row(
 children: [
 Expanded(
 child: TextField(
 controller: _couponCtrl,
 textCapitalization: TextCapitalization.characters,
 decoration: InputDecoration(
 hintText: 'Enter coupon code',
 hintStyle:
 TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 14),
 filled: true,
 fillColor: AppTheme.elevatedOf(context),
 border: OutlineInputBorder(
 borderRadius: BorderRadius.circular(12),
 borderSide: BorderSide.none,
 ),
 contentPadding:
 EdgeInsets.symmetric(horizontal: 14, vertical: 12),
 ),
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontWeight: FontWeight.bold,
 fontSize: 15,
 letterSpacing: 1.5,
 ),
 onChanged: (_) {
 if (_quote != null) {
 setState(() {
 _quote = null;
 _quoteMessage = '';
 });
 } else {
 setState(() {});
 }
 },
 ),
 ),
 SizedBox(width: 10),
 SizedBox(
 height: 44,
 child: ElevatedButton(
 onPressed:
 _couponCtrl.text.trim().isEmpty ? null : _applyCoupon,
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 disabledBackgroundColor: AppTheme.borderOf(context),
 minimumSize: Size(80, 44),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(12),
 ),
 ),
 child: _checkingCoupon
 ? SizedBox(
 width: 20,
 height: 20,
 child: CircularProgressIndicator(
 strokeWidth: 2,
 color: AppTheme.surfaceOf(context),
 ),
 )
 : Text('Apply',
 style: TextStyle(
 fontWeight: FontWeight.bold,
 color: AppTheme.surfaceOf(context),
 )),
 ),
 ),
 ],
 ),
 if (_quoteMessage.isNotEmpty)
 Padding(
 padding: EdgeInsets.only(top: 8),
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
 final discount = (_quote?['discount_paise'] as num?)?.toInt() ?? 0;
 final total = _finalAmountPaise;

 return Container(
 padding: EdgeInsets.all(20),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Column(
 children: [
 _priceRow('Subtotal', '₹${_formatPaise((widget.amountInr * 100).toInt())}'),
 if (_hasDiscount) ...[
 SizedBox(height: 8),
 _priceRow('Discount',
 '- ₹${_formatPaise(discount)}',
 valueColor: AppTheme.success),
 ],
 Divider(color: AppTheme.borderOf(context), height: 24),
 _priceRow('Total', '₹${_formatPaise(total)}',
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
 color: AppTheme.mutedOf(context),
 fontSize: 14,
 fontWeight: titleWeight)),
 Text(value,
 style: TextStyle(
 color: valueColor ?? AppTheme.textPrimaryOf(context),
 fontSize: valueSize,
 fontWeight: valueWeight,
 )),
 ],
 );
 }

 Widget _buildBottomBar() {
 return Container(
 padding: EdgeInsets.fromLTRB(24, 12, 24, 24),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 border: Border(top: BorderSide(color: AppTheme.borderOf(context))),
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
 disabledBackgroundColor: AppTheme.borderOf(context),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(16),
 ),
 ),
 child: _isLoading
 ? Row(
 mainAxisAlignment: MainAxisAlignment.center,
 children: [
 SizedBox(
 width: 20,
 height: 20,
 child: CircularProgressIndicator(
 strokeWidth: 2,
 color: AppTheme.surfaceOf(context),
 ),
 ),
 SizedBox(width: 12),
 Text(
 _status,
 style: TextStyle(
 fontSize: 14,
 color: AppTheme.surfaceOf(context),
 ),
 ),
 ],
 )
 : Text(
 _finalAmountPaise == 0
 ? 'Free • Confirm Order'
 : 'Pay ₹${_formatPaise(_finalAmountPaise)}',
 style: TextStyle(
 fontSize: 18,
 fontWeight: FontWeight.bold,
 color: AppTheme.surfaceOf(context),
 ),
 ),
 ),
 ),
 );
 }

 InputDecoration _inputDecoration(String label) {
 return InputDecoration(
 hintText: label,
 hintStyle: TextStyle(color: AppTheme.textSecondaryOf(context), fontSize: 14),
 filled: true,
 fillColor: AppTheme.elevatedOf(context),
 border: OutlineInputBorder(
 borderRadius: BorderRadius.circular(12),
 borderSide: BorderSide.none,
 ),
 contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
 );
 }

 TextStyle _inputStyle() {
 return TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 15,
 );
 }
}