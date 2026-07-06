import 'package:flutter/foundation.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;

  Map<String, dynamic>? get user => _user;

  void setUser(Map<String, dynamic>? user) {
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    notifyListeners();
  }
}
