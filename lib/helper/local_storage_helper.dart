import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageHelper {
  static late LocalStorageHelper _instance;

  final SharedPreferences prefs;

  LocalStorageHelper._internal({required this.prefs});

  factory LocalStorageHelper({required SharedPreferences prefs}) {
    _instance = LocalStorageHelper._internal(prefs: prefs);
    return _instance;
  }

  static LocalStorageHelper get instance => _instance;

  static LocalStorageHelper init({required SharedPreferences prefs}) {
    _instance = LocalStorageHelper._internal(prefs: prefs);
    return _instance;
  }

  Future<void> setObject(String key, dynamic value) async {
    await prefs.setString(key, jsonEncode(value));
  }

  dynamic getString(String key) {
    final value = prefs.getString(key);
    if (value == null) {
      return null;
    }
    return jsonDecode(value);
  }

  Future<void> clearAll() async {
    await prefs.clear();
  }
}
