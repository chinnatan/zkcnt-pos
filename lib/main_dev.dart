import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:pocketbase_drift/pocketbase_drift.dart';
import 'package:toastification/toastification.dart';
import 'package:zkcnt_pos_app/app/app.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/helper/notify_helper.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  AppConfig.dev();

  // Load the schema from your assets
  final schema = await rootBundle.loadString(LocalDBConst.schema);
  // initialize pocketbase with schema
  PocketBaseHelper.init(
    pocketBase: $PocketBase.database(AppConfig.instance.baseUrl)
      ..cacheSchema(schema),
  );

  /// init notify helper
  NotifyHelper.init(toastification: Toastification());

  usePathUrlStrategy();
  runApp(const MainAppLocalization());
}
