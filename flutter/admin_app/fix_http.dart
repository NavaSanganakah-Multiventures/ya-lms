// ignore_for_file: avoid_print

import 'dart:io';

void main() {
  final dir = Directory('lib');
  final files = dir.listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'));
  
  for (final file in files) {
    var content = file.readAsStringSync();
    final original = content;
    
    content = content.replaceAll("import 'package:http/http.dart' as http;", "import 'package:dio/dio.dart';");
    content = content.replaceAll("http.Response", "Response");
    content = content.replaceAll("response.body", "response.data");
    content = content.replaceAll("res.body", "res.data");
    
    if (content != original) {
      file.writeAsStringSync(content);
      print('Updated \${file.path}');
    }
  }
}
