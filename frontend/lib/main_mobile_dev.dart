import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:pocketbase/pocketbase.dart';
import 'package:zkcnt_pos_app/app/app.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  AppConfig.dev();

  // initialize pocketbase
  PocketBaseHelper.init(pocketBase: PocketBase(AppConfig.instance.baseUrl));

  runApp(const MainAppLocalization());
}
