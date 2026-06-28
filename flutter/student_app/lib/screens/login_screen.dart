import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

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
      _showMessage('कृपया अपना ईमेल दर्ज करें');
      return;
    }
    
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    if (!emailRegex.hasMatch(identifier)) {
      _showMessage('कृपया सही ईमेल दर्ज करें (उदाहरण: user@email.com)');
      return;
    }

    setState(() => _isLoading = true);
    final provider = Provider.of<AuthProvider>(context, listen: false);
    final result = await provider.sendOtp(identifier);
    if (!mounted) return;
    setState(() {
      _isLoading = false;
      _isOtpSent = result['success'] == true;
    });
    if (result['success'] == true) {
      _showMessage('OTP भेज दिया गया है');
    } else {
      _showMessage(result['message']?.toString() ?? 'OTP भेजने में समस्या हुई');
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length < 4) {
      _showMessage('कृपया सही OTP दर्ज करें');
      return;
    }

    setState(() => _isLoading = true);
    final provider = Provider.of<AuthProvider>(context, listen: false);
    final result = await provider.verifyOtp(
      _identifierController.text.trim(),
      otp,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (result['success'] != true) {
      _showMessage(result['message']?.toString() ?? 'OTP मान्य नहीं है');
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
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topRight,
            radius: 1.2,
            colors: [AppTheme.moccasinLight, AppTheme.background],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _BrandHeader(),
                    const SizedBox(height: 32),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const _LoginBadge(),
                            SizedBox(height: 16),
                            const Text(
                              'Student Login',
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.6,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'पासवर्ड के बिना तुरंत लॉग इन करें।',
                              style: TextStyle(color: AppTheme.textSecondary, height: 1.5),
                            ),
                            const SizedBox(height: 26),
                            TextField(
                              controller: _identifierController,
                              enabled: !_isOtpSent && !_isLoading,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              onSubmitted: (_) { if (!_isLoading) _sendOtp(); },
                              decoration: const InputDecoration(
                                labelText: 'ईमेल पता',
                                hintText: 'अपना ईमेल दर्ज करें',
                                prefixIcon: Icon(Icons.mail_outline),
                              ),
                            ),
                            const SizedBox(height: 16),
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 250),
                              child: _isOtpSent
                                  ? TextField(
                                      key: const ValueKey('otp'),
                                      controller: _otpController,
                                      keyboardType: TextInputType.number,
                                      textInputAction: TextInputAction.done,
                                      decoration: const InputDecoration(
                                        labelText: 'OTP दर्ज करें',
                                        prefixIcon: Icon(Icons.lock_outline),
                                      ),
                                      onSubmitted: (_) => _verifyOtp(),
                                    )
                                  : const SizedBox.shrink(key: ValueKey('empty')),
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: _isLoading ? null : (_isOtpSent ? _verifyOtp : _sendOtp),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(
                                      _isOtpSent ? 'सत्यापित करें और लॉग इन करें' : 'ईमेल से जारी रखें',
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                    ),
                            ),
                            if (_isOtpSent) ...[
                              const SizedBox(height: 14),
                              TextButton(
                                onPressed: _isLoading
                                    ? null
                                    : () => setState(() {
                                          _isOtpSent = false;
                                          _otpController.clear();
                                        }),
                                child: const Text('दूसरा ईमेल उपयोग करें'),
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
  const _BrandHeader();

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
            boxShadow: const [
              BoxShadow(color: Color(0x66FF8C00), blurRadius: 34, offset: Offset(0, 18)),
            ],
          ),
          child: const Icon(Icons.auto_stories_rounded, color: Colors.white, size: 44),
        ),
        const SizedBox(height: 18),
        const Text(
          'Adityanveshan',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 34,
            fontWeight: FontWeight.w900,
            letterSpacing: -1.2,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
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
  const _LoginBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0x22FF8C00), Color(0x22FFD700)]),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.primary),
      ),
      child: const Row(
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
