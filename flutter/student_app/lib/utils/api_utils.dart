class ApiUtils {
 ApiUtils._();

 static List<dynamic> extractList(Map<String, dynamic> data, String key) {
 final raw = data[key];
 if (raw is List) return raw;
 return [];
 }
}
