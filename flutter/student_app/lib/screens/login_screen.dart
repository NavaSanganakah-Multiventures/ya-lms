import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isOtpSent = false;
  bool _isLoading = false;

  void _sendOtp() async {
    setState(() => _isLoading = true);
    final provider = Provider.of<AuthProvider>(context, listen: false);
    final success = await provider.sendOtp(_identifierController.text.trim());
    setState(() {
      _isLoading = false;
      if (success) {
        _isOtpSent = true;
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send OTP')),
        );
      }
    });
  }

  void _verifyOtp() async {
    setState(() => _isLoading = true);
    final provider = Provider.of<AuthProvider>(context, listen: false);
    final success = await provider.verifyOtp(
      _identifierController.text.trim(),
      _otpController.text.trim(),
    );
    setState(() => _isLoading = false);
    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invalid OTP')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Adityanveshan Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _identifierController,
              decoration: InputDecoration(
                labelText: 'Email or Student ID',
                border: OutlineInputBorder(),
              ),
              enabled: !_isOtpSent,
            ),
            SizedBox(height: 16),
            if (_isOtpSent)
              TextField(
                controller: _otpController,
                decoration: InputDecoration(
                  labelText: 'Enter OTP',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            SizedBox(height: 24),
            _isLoading
                ? CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _isOtpSent ? _verifyOtp : _sendOtp,
                    child: Text(_isOtpSent ? 'Verify OTP' : 'Send OTP'),
                  ),
          ],
        ),
      ),
    );
  }
}
