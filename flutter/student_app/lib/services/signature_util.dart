import 'dart:convert';
import 'package:crypto/crypto.dart';

class SignatureUtil {
  // Hardcoded for demonstration, ideally injected via --dart-define
  static const String _appSecret = String.fromEnvironment('APP_API_SECRET', defaultValue: 'CHANGE_ME_IN_PRODUCTION');

  static Map<String, String> generateSignatureHeaders(String method, String path) {
    if (_appSecret.isEmpty) return {};

    final int timestamp = (DateTime.now().millisecondsSinceEpoch / 1000).floor();
    final String dataToSign = '$method:$path:$timestamp';

    final List<int> keyBytes = utf8.encode(_appSecret);
    final List<int> dataBytes = utf8.encode(dataToSign);

    final Hmac hmac = Hmac(sha256, keyBytes);
    final Digest digest = hmac.convert(dataBytes);

    return {
      'X-App-Signature': digest.toString(),
      'X-App-Timestamp': timestamp.toString(),
    };
  }
}
