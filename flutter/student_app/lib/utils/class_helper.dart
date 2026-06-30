import 'package:flutter/material.dart';

class ClassHelper {
  ClassHelper._();

  static void joinLiveClass(BuildContext context, Map<String, dynamic> session) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Joining live class...')),
    );
  }
}
