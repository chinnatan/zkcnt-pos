import 'package:flutter/material.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';

class AuthNotifier extends ChangeNotifier {
  bool isAuthenticated = false;
  AuthNotifier() {
    init();
  }

  void init() async {
    LogHelper.i('AuthNotifier init');
    final isAuthenticated = DefaultRouteGuard.isAuthenticated();
    LogHelper.i('AuthNotifier isAuthenticated: $isAuthenticated');
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
