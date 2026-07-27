import 'dart:convert';
import 'package:crypto/crypto.dart';

class SignatureUtil {
  SignatureUtil._();

  static Map<String, String> generateSignatureHeaders(String method, String path) {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    const appSecret = String.fromEnvironment('APP_API_SECRET');

    // Server signs: new URL(url).pathname — decoded, normalized.
    // Dio paths are already percent-encoded, so decode first.
    final decodedPath = Uri.decodeFull(path);
    final rawPath = decodedPath.startsWith('/') ? decodedPath : '/$decodedPath';
    final normalizedPath = Uri.parse(rawPath).normalizePath().path;

    if (appSecret.isEmpty) {
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
