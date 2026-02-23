import 'package:pocketbase_drift/pocketbase_drift.dart';

class PocketBaseHelper {
  static late PocketBaseHelper _instance;

  final $PocketBase pb;

  PocketBaseHelper._internal({required this.pb});

  factory PocketBaseHelper({required $PocketBase pb}) {
    _instance = PocketBaseHelper._internal(pb: pb);
    return _instance;
  }

  static PocketBaseHelper get instance => _instance;

  static PocketBaseHelper init({required $PocketBase pocketBase}) {
    _instance = PocketBaseHelper._internal(pb: pocketBase);
    return _instance;
  }
}
