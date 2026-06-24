class ApiUtils {
  static List<dynamic> extractList(dynamic decoded, String key) {
    if (decoded is Map) {
      final value = decoded[key];
      if (value is Iterable) {
        return List<dynamic>.from(value);
      }
      return [];
    } else if (decoded is List) {
      return List<dynamic>.from(decoded);
    }
    return [];
  }
}
