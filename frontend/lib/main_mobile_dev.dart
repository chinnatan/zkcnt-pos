import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:zkcnt_pos_app/app/app.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  AppConfig.dev();
  runApp(const MainAppLocalization());
}
