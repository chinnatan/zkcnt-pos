import 'package:dio/dio.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/core/network/service/user_service.dart';

class DioClient {
  var appConfig = AppConfig.instance;
  static final DioClient _singleton = DioClient._internal();
  final Dio _dio;

  /// ประกาศ service
  late final UserService userService;

  factory DioClient() {
    return _singleton;
  }

  DioClient._internal()
    : _dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.instance.baseUrl,
          connectTimeout: Duration(seconds: 30),
          receiveTimeout: Duration(seconds: 20),
          extra: {'withCredentials': true},
        ),
      ) {
    if (AppConfig.isDev()) {
      _dio.interceptors.add(
        LogInterceptor(
          request: true,
          requestBody: true,
          responseBody: true,
          error: true,
        ),
      );
    }

    // add headers
    _dio.options.headers.addAll({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    /// สร้าง service
    userService = UserService(_dio, baseUrl: AppConfig.instance.baseUrl);
  }

  Dio get instance => _dio;
  Dio get dio => _dio;
}
