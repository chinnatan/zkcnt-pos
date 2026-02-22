import 'package:logger/logger.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';

class LogHelper {
  static final Logger _logger = Logger(printer: PrettyPrinter());

  static void i(String message) {
    if (AppConfig.isDev()) {
      _logger.i(message);
    }
  }

  static void d(String message) {
    if (AppConfig.isDev()) {
      _logger.d(message);
    }
  }

  static void w(String message) {
    if (AppConfig.isDev()) {
      _logger.w(message);
    }
  }

  static void e(String message, {dynamic error, StackTrace? stackTrace}) {
    if (AppConfig.isDev()) {
      _logger.e(message, error: error, stackTrace: stackTrace);
    }
  }

  static void f(String message) {
    if (AppConfig.isDev()) {
      _logger.f(message);
    }
  }

  static void log(Level level, String message) {
    if (AppConfig.isDev()) {
      _logger.log(level, message);
    }
  }
}
