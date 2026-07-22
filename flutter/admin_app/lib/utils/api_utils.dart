class ApiUtils {
  /// Extracts a list from [decoded] response, filtering to Map items only.
  ///
  /// Accepts both `{ key: [...] }` objects and bare `[...]` arrays.
  /// Non-Map items (e.g. strings, numbers) are filtered out to prevent
  /// `NoSuchMethodError` when screens access `item['key']`.
  static List<Map<String, dynamic>> extractList(dynamic decoded, String key) {
    Iterable? raw;
    if (decoded is Map) {
      raw = decoded[key] as Iterable?;
    } else if (decoded is List) {
      raw = decoded;
    }
    if (raw == null) return [];
    return raw.whereType<Map<String, dynamic>>().toList();
  }

  /// Safely reads [key] from [data] as a String, or returns [defaultValue].
  static String safeString(dynamic data, String key, {String defaultValue = ''}) {
    if (data is! Map) return defaultValue;
    final val = data[key];
    if (val == null) return defaultValue;
    return val.toString();
  }
}
