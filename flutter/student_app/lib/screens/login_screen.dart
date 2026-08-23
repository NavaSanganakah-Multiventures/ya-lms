import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/yuva/index.dart';

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
      if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$').hasMatch(identifier)) {
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
      setState(() => _isOtpSent = result['success'] == true);
      _showMessage(
        result['success'] == true
            ? 'OTP भेज दिया गया है'
            : result['message']?.toString() ?? 'OTP भेजने में समस्या हुई',
      );
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
      final result = await provider.verifyOtp(identifier, otp);
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
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _resetIdentifier() {
    setState(() {
      _isOtpSent = false;
      _otpController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark
              ? const LinearGradient(
                  colors: [AppTheme.darkBackground, Color(0xFF111827)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                )
              : AppTheme.backgroundGradient(context),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppTheme.space6),
              child: ResponsiveLayout(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _BrandHeader()
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .slideY(begin: -0.2, end: 0, duration: 600.ms),
                    const SizedBox(height: AppTheme.space7),
                    _OnboardingIllustration()
                        .animate(delay: 200.ms)
                        .fadeIn(duration: 600.ms)
                        .slideY(begin: 0.2, end: 0, duration: 600.ms),
                    const SizedBox(height: AppTheme.space6),
                    YuvaCard(
                      padding: const EdgeInsets.all(AppTheme.space5),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _SecureBadge(),
                          const SizedBox(height: AppTheme.space4),
                          Text(
                            _isOtpSent ? 'OTP Verify करें' : 'Student Login',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: AppTheme.textPrimaryOf(context),
                                  fontSize: 26,
                                ),
                          ),
                          const SizedBox(height: AppTheme.space2),
                          Text(
                            _isOtpSent
                                ? '${_identifierController.text} पर भेजा गया OTP दर्ज करें'
                                : 'पासवर्ड के बिना तुरंत लॉग इन करें।',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AppTheme.textSecondaryOf(context),
                                ),
                          ),
                          const SizedBox(height: AppTheme.space5),
                          YuvaInput(
                            controller: _identifierController,
                            label: 'ईमेल या Student ID',
                            hint: 'ईमेल या Student ID दर्ज करें',
                            prefixIcon: Icons.alternate_email_rounded,
                            enabled: !_isOtpSent && !_isLoading,
                            textInputAction: TextInputAction.next,
                            onSubmitted: (_) {
                              if (!_isLoading && !_isOtpSent) _sendOtp();
                            },
                          ),
                          const SizedBox(height: AppTheme.space4),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            transitionBuilder: (child, animation) => SizeTransition(
                              sizeFactor: animation,
                              axisAlignment: -1,
                              child: FadeTransition(opacity: animation, child: child),
                            ),
                            child: _isOtpSent
                                ? YuvaInput(
                                    key: const ValueKey('otp'),
                                    controller: _otpController,
                                    label: 'OTP दर्ज करें',
                                    hint: '4-6 अंकों का OTP',
                                    prefixIcon: Icons.lock_outline_rounded,
                                    keyboardType: TextInputType.number,
                                    textInputAction: TextInputAction.done,
                                    onSubmitted: (_) => _verifyOtp(),
                                  )
                                : const SizedBox.shrink(key: ValueKey('empty')),
                          ),
                          const SizedBox(height: AppTheme.space5),
                          YuvaButton.primary(
                            label: _isOtpSent ? 'सत्यापित करें और लॉग इन करें' : 'ईमेल से जारी रखें',
                            isLoading: _isLoading,
                            onPressed: _isLoading
                                ? null
                                : (_isOtpSent ? _verifyOtp : _sendOtp),
                          ),
                          if (_isOtpSent) ...[
                            const SizedBox(height: AppTheme.space3),
                            Center(
                              child: TextButton(
                                onPressed: _isLoading ? null : _resetIdentifier,
                                child: Text(
                                  'दूसरा ईमेल उपयोग करें',
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        color: AppTheme.primary,
                                        fontSize: 14,
                                      ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    )
                        .animate(delay: 300.ms)
                        .fadeIn(duration: 600.ms)
                        .slideY(begin: 0.15, end: 0, duration: 600.ms),
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
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            gradient: AppTheme.auroraGradient,
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            boxShadow: AppTheme.mediumShadow,
          ),
          child: const Icon(Icons.auto_stories_rounded, color: AppTheme.surface, size: 42),
        ),
        const SizedBox(height: AppTheme.space4),
        Text(
          'Adityanveshan',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                color: AppTheme.textPrimaryOf(context),
                fontSize: 32,
              ),
        ),
        const SizedBox(height: AppTheme.space1),
        Text(
          'SWADHYAYA • CLASSES • AI DOUBTS',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppTheme.primary,
                letterSpacing: 2,
              ),
        ),
      ],
    );
  }
}

class _OnboardingIllustration extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.space4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _FeaturePill(icon: Icons.menu_book_rounded, label: 'Courses'),
          _FeaturePill(icon: Icons.live_tv_rounded, label: 'Live Classes'),
          _FeaturePill(icon: Icons.psychology_rounded, label: 'AI Mentor'),
        ],
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(AppTheme.space3),
          decoration: BoxDecoration(
            color: AppTheme.primary.withAlphaOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppTheme.primary, size: 24),
        ),
        const SizedBox(height: AppTheme.space2),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondaryOf(context),
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

class _SecureBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space3, vertical: AppTheme.space1 + 4),
      decoration: BoxDecoration(
        gradient: AppTheme.goldGradient,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.shield_moon_outlined, color: AppTheme.surface, size: 16),
          const SizedBox(width: AppTheme.space2),
          Text(
            'Secure OTP Access',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppTheme.surface,
                  fontSize: 12,
                ),
          ),
        ],
      ),
    );
  }
}
