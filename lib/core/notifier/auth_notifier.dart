import 'package:flutter/material.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';

class AuthNotifier extends ChangeNotifier {
  bool isAuthenticated = false;
  AuthNotifier() {
    init();
  }

  void init() async {
    final isAuthenticated = DefaultRouteGuard.isAuthenticated();
    if (isAuthenticated) {
      this.isAuthenticated = true;
      notifyListeners();
    } else {
      final isRefreshed = await DefaultRouteGuard.refreshAuth();
      if (isRefreshed) {
        this.isAuthenticated = true;
        notifyListeners();
      }
    }
  }
}
