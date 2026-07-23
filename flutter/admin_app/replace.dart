// ignore_for_file: avoid_print

import 'dart:io';

void main() {
  final dir = Directory('lib');
  final files = dir.listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'));
  
  for (final file in files) {
    var content = file.readAsStringSync();
    final original = content;
    
    content = content.replaceAll('jsonDecode(response.body)', 'response.data');
    content = content.replaceAll('jsonDecode(res.body)', 'res.data');
    content = content.replaceAll('json.decode(response.body)', 'response.data');
    
    if (content != original) {
      file.writeAsStringSync(content);
      print('Updated \${file.path}');
    }
  }
}
