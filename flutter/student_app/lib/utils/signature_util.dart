import 'dart:convert';
import 'package:crypto/crypto.dart';

class SignatureUtil {
  SignatureUtil._();

  static Map<String, String> generateSignatureHeaders(String method, String path) {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    const appSecret = String.fromEnvironment('APP_API_SECRET');

    // Server signs the request URL pathname, which always starts with '/'.
    // Normalize so the HMAC matches regardless of how the caller passes the path.
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    if (appSecret.isEmpty) {
      // Fail closed: a build without the APP_API_SECRET cannot authenticate
      // with the API. Provide a clear message so CI/dev builds fail loudly.
      throw StateError('APP_API_SECRET is not configured. API signing unavailable.');
    }

    final dataToSign = '$method:$normalizedPath:$timestamp';
    final key = utf8.encode(appSecret);
    final bytes = utf8.encode(dataToSign);

    final hmac = Hmac(sha256, key);
    final digest = hmac.convert(bytes);

    return {
      'X-App-Signature': digest.toString(),
      'X-App-Timestamp': timestamp,
    };
  }
}
