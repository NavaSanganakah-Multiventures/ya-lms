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
      _showMessage('कृपया Email या Student ID दर्ज करें');
      return;
    }

    setState(() => _isLoading = true);
    final provider = Provider.of<AuthProvider>(context, listen: false);
    final success = await provider.sendOtp(identifier);
    if (!mounted) return;
    setState(() {
      _isLoading = false;
      _isOtpSent = success;
    });
    if (success) {
      _showMessage('OTP भेज दिया गया है');
    } else {
      _showMessage('OTP भेजने में समस्या हुई');
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
    final success = await provider.verifyOtp(
      _identifierController.text.trim(),
      otp,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (!success) {
      _showMessage('OTP मान्य नहीं है');
    }
  }

  void _showMessage(String message) {
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
            colors: [Color(0x663B1607), AppTheme.background],
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
                            const Text(
                              'Student Login',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.6,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'वेबसाइट वाले सुरक्षित OTP login से ही app में प्रवेश करें।',
                              style: TextStyle(color: AppTheme.muted, height: 1.5),
                            ),
                            const SizedBox(height: 26),
                            TextField(
                              controller: _identifierController,
                              enabled: !_isOtpSent && !_isLoading,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: 'Email या Student ID',
                                prefixIcon: Icon(Icons.person_outline),
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
                              onPressed: _isLoading ? null : (_isOtpSent ? _verifyOtp : _sendOtp),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(_isOtpSent ? 'VERIFY OTP' : 'SEND OTP'),
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
                                child: const Text('Email / ID बदलें'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const _SecureApiNote(),
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
          width: 78,
          height: 78,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(color: Color(0x55EA580C), blurRadius: 30, offset: Offset(0, 16)),
            ],
          ),
          child: const Icon(Icons.local_fire_department_rounded, color: Colors.white, size: 42),
        ),
        const SizedBox(height: 18),
        const Text(
          'Adityanveshan',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
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
            color: AppTheme.primaryLight,
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.6,
          ),
        ),
      ],
    );
  }
}

class _SecureApiNote extends StatelessWidget {
  const _SecureApiNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0x1116A34A),
        border: Border.all(color: const Color(0x3322C55E)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Row(
        children: [
          Icon(Icons.verified_user_outlined, color: AppTheme.success, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'App वही website API और login session use करता है, इसलिए database अलग से touch नहीं होता।',
              style: TextStyle(color: AppTheme.muted, fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
