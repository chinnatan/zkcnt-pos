import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:pocketbase_drift/pocketbase_drift.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:toastification/toastification.dart';
import 'package:zkcnt_pos_app/app/app.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/helper/local_storage_helper.dart';
import 'package:zkcnt_pos_app/helper/notify_helper.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  AppConfig.local();

  // Load the schema from your assets
  final schema = await rootBundle.loadString(LocalDBConst.schema);
  final executor = driftDatabase(
    name: LocalDBConst.databaseName,
    web: DriftWebOptions(
      sqlite3Wasm: Uri.parse(LocalDBConst.sqlite3Wasm),
      driftWorker: Uri.parse(LocalDBConst.driftWorker),
    ),
  );
  // initialize pocketbase with schema
  PocketBaseHelper.init(
    pocketBase: $PocketBase.database(
      AppConfig.instance.baseUrl,
      connection: DatabaseConnection(executor),
    )..cacheSchema(schema),
  );

  /// init notify helper
  NotifyHelper.init(toastification: Toastification());

  /// init local storage helper (keys stored as-is, no prefix)
  LocalStorageHelper.init(prefs: await SharedPreferences.getInstance());

  usePathUrlStrategy();
  runApp(const MainAppLocalization());
}
