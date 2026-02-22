import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/feature/ui/sign_in_screen.dart';

class MobileRoute {
  final String name;
  final String path;

  MobileRoute({required this.name, required this.path});
}

class MobileRouteBuilder {
  static MobileRoute home() {
    return MobileRoute(name: 'home', path: '/');
  }

  static MobileRoute signIn() {
    return MobileRoute(name: 'signIn', path: '/sign-in');
  }
}

final _routes = [
  GoRoute(
    name: MobileRouteBuilder.home().name,
    path: MobileRouteBuilder.home().path,
    builder: (context, state) => SignInScreen(),
  ),
  GoRoute(
    name: MobileRouteBuilder.signIn().name,
    path: MobileRouteBuilder.signIn().path,
    builder: (context, state) => SignInScreen(),
  ),
];

class MobileRouteConfig {
  static GoRouter init() {
    return GoRouter(routes: _routes);
  }
}
