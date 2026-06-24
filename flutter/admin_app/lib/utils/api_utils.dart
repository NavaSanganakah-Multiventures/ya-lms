class ApiUtils {
  static List<dynamic> extractList(dynamic decoded, String key) {
    if (decoded is Map) {
      return List<dynamic>.from(decoded[key] ?? []);
    } else if (decoded is List) {
      return List<dynamic>.from(decoded);
    }
    return [];
  }
}
