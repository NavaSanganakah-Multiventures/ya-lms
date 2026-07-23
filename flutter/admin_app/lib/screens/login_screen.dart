import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/admin_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isOtpSent = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showError('कृपया अपना ईमेल दर्ज करें');
      return;
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      _showError('कृपया सही ईमेल पता दर्ज करें');
      return;
    }

    setState(() => _isLoading = true);
    final provider = context.read<AdminProvider>();
    final success = await provider.sendOtp(email);
    if (!mounted) return;
    if (success) {
      setState(() {
        _isLoading = false;
        _isOtpSent = true;
      });
      _showMessage('OTP आपके ईमेल पर भेज दिया गया है');
    } else {
      setState(() => _isLoading = false);
      _showError(provider.error ?? 'OTP भेजने में विफल');
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.isEmpty || otp.length < 6) {
      _showError('कृपया सही OTP दर्ज करें');
      return;
    }

    setState(() => _isLoading = true);
    final provider = context.read<AdminProvider>();
    final success = await provider.verifyOtp(email, otp);
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (!success) {
      _showError(provider.error ?? 'OTP verification failed');
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppTheme.danger),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppTheme.success),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.admin_panel_settings, size: 80, color: AppTheme.primary),
                const SizedBox(height: 24),
                const Text(
                  'Adityanveshan',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const Text(
                  'Admin Console',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: AppTheme.muted),
                ),
                const SizedBox(height: 48),

                TextField(
                  controller: _emailController,
                  enabled: !_isOtpSent,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'ईमेल (Email)',
                    prefixIcon: Icon(Icons.email),
                  ),
                ),

                if (_isOtpSent) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      labelText: 'OTP',
                      prefixIcon: Icon(Icons.lock_clock),
                      counterText: '',
                    ),
                  ),
                ],

                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: _isLoading ? null : (_isOtpSent ? _verifyOtp : _sendOtp),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(_isOtpSent ? 'Verify OTP & Login' : 'Send OTP'),
                ),

                if (_isOtpSent) ...[
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: _isLoading ? null : () => setState(() {
                      _isOtpSent = false;
                      _otpController.clear();
                    }),
                    child: const Text('Change Email', style: TextStyle(color: AppTheme.muted)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
      ),
    );
  }
}
