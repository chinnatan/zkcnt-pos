enum FlavorEnvironment { local, development, production }

class AppConfig {
  final FlavorEnvironment flavorEnvironment;
  final String baseUrl;

  static late AppConfig _instance;

  AppConfig._internal({required this.flavorEnvironment, required this.baseUrl});

  factory AppConfig({
    required FlavorEnvironment flavorEnvironment,
    required String baseUrl,
  }) {
    _instance = AppConfig._internal(
      flavorEnvironment: flavorEnvironment,
      baseUrl: baseUrl,
    );
    return _instance;
  }

  static AppConfig get instance => _instance;

  static AppConfig local() {
    return AppConfig(
      flavorEnvironment: FlavorEnvironment.development,
      baseUrl: 'http://localhost:3000/',
    );
  }

  static AppConfig dev() {
    return AppConfig(
      flavorEnvironment: FlavorEnvironment.development,
      baseUrl: 'https://dev-pb-pos-api.zkcnt.com/',
    );
  }

  static bool isLocal() {
    return _instance.flavorEnvironment == FlavorEnvironment.local;
  }

  static bool isDev() {
    return _instance.flavorEnvironment == FlavorEnvironment.development;
  }
}
