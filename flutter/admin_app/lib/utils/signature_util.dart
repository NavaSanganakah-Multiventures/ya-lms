import 'dart:convert';
import 'package:crypto/crypto.dart';

class SignatureUtil {
  SignatureUtil._();

  static Map<String, String> generateSignatureHeaders(String method, String path) {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    const appSecret = String.fromEnvironment('APP_API_SECRET');

    // Server signs the request URL pathname, which always starts with '/'.
    // Dio's RequestOptions.path may omit the leading slash when a baseUrl is set,
    // so normalize here to avoid HMAC mismatches.
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    if (appSecret.isEmpty) {
      return {
        'X-App-Timestamp': timestamp,
      };
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
