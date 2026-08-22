import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/interactive_3d_card.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
 LoginScreen({super.key});

 @override
 State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
 final _identifierController = TextEditingController();
 final _otpController = TextEditingController();
 bool _isOtpSent = false;
 bool _isLoading = false;

 @override
 void dispose() {
 _identifierController.dispose();
 _otpController.dispose();
 super.dispose();
 }

 Future<void> _sendOtp() async {
 final identifier = _identifierController.text.trim();
 if (identifier.isEmpty) {
 _showMessage('कृपया अपना ईमेल या Student ID दर्ज करें');
 return;
 }
 
 if (identifier.contains('@')) {
      if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(identifier)) {
        _showMessage('कृपया सही ईमेल दर्ज करें (उदाहरण: student@email.com)');
        return;
      }
    } else if (identifier.length < 3) {
      _showMessage('कृपया सही Student ID दर्ज करें (कम से कम 3 अक्षर)');
      return;
    }

  setState(() => _isLoading = true);
 try {
 final provider = Provider.of<AuthProvider>(context, listen: false);
 final result = await provider.sendOtp(identifier);
 if (!mounted) return;
 setState(() {
 _isOtpSent = result['success'] == true;
 });
 if (result['success'] == true) {
 _showMessage('OTP भेज दिया गया है');
 } else {
 _showMessage(result['message']?.toString() ?? 'OTP भेजने में समस्या हुई');
 }
 } catch (e) {
 if (!mounted) return;
 _showMessage('OTP भेजने में समस्या हुई: ${e.toString()}');
 } finally {
 if (mounted) setState(() => _isLoading = false);
 }
 }

  Future<void> _verifyOtp() async {
  final otp = _otpController.text.trim();
  if (otp.length < 4) {
  _showMessage('कृपया सही OTP दर्ज करें');
  return;
  }
  final identifier = _identifierController.text.trim();
  if (identifier.isEmpty) {
  _showMessage('कृपया पहले अपना ईमेल या Student ID दर्ज करें');
  return;
  }

 setState(() => _isLoading = true);
 try {
 final provider = Provider.of<AuthProvider>(context, listen: false);
  final result = await provider.verifyOtp(
  identifier,
  otp,
  );
 if (mounted && result['success'] != true) {
 _showMessage(result['message']?.toString() ?? 'OTP मान्य नहीं है');
 }
 } catch (e) {
 if (!mounted) return;
 _showMessage('OTP सत्यापन में समस्या हुई: ${e.toString()}');
 } finally {
 if (mounted) setState(() => _isLoading = false);
 }
 }

 void _showMessage(String message) {
 if (!mounted) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text(message)),
 );
 }

 @override
 Widget build(BuildContext context) {
 return Scaffold(
 body: Container(
 decoration: BoxDecoration(
 gradient: RadialGradient(
 center: Alignment.topRight,
 radius: 1.2,
 colors: [AppTheme.moccasinLightOf(context), AppTheme.backgroundOf(context)],
 ),
 ),
 child: SafeArea(
 child: Center(
 child: SingleChildScrollView(
 padding: EdgeInsets.all(24),
 child: ConstrainedBox(
 constraints: BoxConstraints(maxWidth: 460),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.stretch,
 children: [
 _BrandHeader(),
 SizedBox(height: 32),
 Interactive3DCard(
 padding: EdgeInsets.zero,
 child: Padding(
 padding: EdgeInsets.all(24),
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.stretch,
 children: [
 _LoginBadge(),
 SizedBox(height: 16),
 Text(
 'Student Login',
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 26,
 fontWeight: FontWeight.w900,
 letterSpacing: -0.6,
 ),
 ),
 SizedBox(height: 8),
 Text(
 'पासवर्ड के बिना तुरंत लॉग इन करें।',
 style: TextStyle(color: AppTheme.textSecondaryOf(context), height: 1.5),
 ),
 SizedBox(height: 26),
 TextField(
 controller: _identifierController,
 enabled: !_isOtpSent && !_isLoading,
 keyboardType: TextInputType.text,
 textInputAction: TextInputAction.next,
 onSubmitted: (_) { if (!_isLoading) _sendOtp(); },
 decoration: InputDecoration(
 labelText: 'ईमेल या Student ID',
 hintText: 'ईमेल या Student ID दर्ज करें',
 prefixIcon: Icon(Icons.mail_outline),
 ),
 ),
 SizedBox(height: 16),
 AnimatedSwitcher(
 duration: Duration(milliseconds: 250),
 child: _isOtpSent
 ? TextField(
 key: ValueKey('otp'),
 controller: _otpController,
 keyboardType: TextInputType.number,
 textInputAction: TextInputAction.done,
 decoration: InputDecoration(
 labelText: 'OTP दर्ज करें',
 prefixIcon: Icon(Icons.lock_outline),
 ),
 onSubmitted: (_) => _verifyOtp(),
 )
 : SizedBox.shrink(key: ValueKey('empty')),
 ),
 SizedBox(height: 24),
 ElevatedButton(
 style: ElevatedButton.styleFrom(
 backgroundColor: AppTheme.primary,
 foregroundColor: Colors.white,
 padding: EdgeInsets.symmetric(vertical: 14),
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(8),
 ),
 ),
 onPressed: _isLoading ? null : (_isOtpSent ? _verifyOtp : _sendOtp),
 child: _isLoading
 ? SizedBox(
 height: 22,
 width: 22,
 child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
 )
 : Text(
 _isOtpSent ? 'सत्यापित करें और लॉग इन करें' : 'ईमेल से जारी रखें',
 style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
 ),
 ),
 if (_isOtpSent) ...[
 SizedBox(height: 14),
 TextButton(
 onPressed: _isLoading
 ? null
 : () => setState(() {
 _isOtpSent = false;
 _otpController.clear();
 }),
 child: Text('दूसरा ईमेल उपयोग करें'),
 ),
 ],
 ],
 ),
 ),
 ),
 ],
 ),
 ),
 ),
 ),
 ),
 ),
 );
 }
}

class _BrandHeader extends StatelessWidget {
 _BrandHeader();

 @override
 Widget build(BuildContext context) {
 return Column(
 children: [
 Container(
 width: 84,
 height: 84,
 decoration: BoxDecoration(
 gradient: AppTheme.sacredGradient,
 borderRadius: BorderRadius.circular(28),
 boxShadow: [
 BoxShadow(color: Color(0x66FF8C00), blurRadius: 34, offset: Offset(0, 18)),
 ],
 ),
 child: Icon(Icons.auto_stories_rounded, color: Colors.white, size: 44),
 ),
 SizedBox(height: 18),
 Text(
 'Adityanveshan',
 textAlign: TextAlign.center,
 style: TextStyle(
 color: AppTheme.textPrimaryOf(context),
 fontSize: 34,
 fontWeight: FontWeight.w900,
 letterSpacing: -1.2,
 ),
 ),
 SizedBox(height: 6),
 Text(
 'Swadhyaya Vedika • Live Classes • Courses',
 textAlign: TextAlign.center,
 style: TextStyle(
 color: AppTheme.primary,
 fontSize: 11,
 fontWeight: FontWeight.w900,
 letterSpacing: 1.6,
 ),
 ),
 ],
 );
 }
}

class _LoginBadge extends StatelessWidget {
 _LoginBadge();

 @override
 Widget build(BuildContext context) {
 return Container(
 padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
 decoration: BoxDecoration(
 gradient: LinearGradient(colors: [Color(0x22FF8C00), Color(0x22FFD700)]),
 borderRadius: BorderRadius.circular(999),
 border: Border.all(color: AppTheme.primary),
 ),
 child: Row(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.shield_moon_outlined, color: AppTheme.primary, size: 16),
 SizedBox(width: 8),
 Text('Secure OTP Access', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w800)),
 ],
 ),
 );
 }
}
