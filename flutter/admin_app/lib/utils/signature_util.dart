import 'dart:convert';
import 'package:crypto/crypto.dart';

class SignatureUtil {
  SignatureUtil._();

  static Map<String, String> generateSignatureHeaders(String method, String path) {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    const appSecret = String.fromEnvironment('APP_API_SECRET');

    if (appSecret.isEmpty) {
      // Fail closed: a build without the APP_API_SECRET cannot authenticate
      // with the API. Provide a clear message so CI/dev builds fail loudly.
      throw StateError('APP_API_SECRET is not configured. API signing unavailable.');
    }

    // Server signs new URL(request.url).pathname which returns the DECODED path.
    // The Dio options.path retains percent-encoding, so we decode it first to match.
    final decodedPath = Uri.decodeFull(path);
    final rawPath = decodedPath.startsWith('/') ? decodedPath : '/$decodedPath';
    // Use .path (not .toString()) to strip any query/fragment and get decoded output
    final normalizedPath = Uri.parse(rawPath).normalizePath().path;

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
