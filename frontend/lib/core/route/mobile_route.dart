import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/feature/sign_in/ui/sign_in_screen.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/datasource/user_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/repository/user_repository_impl.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/usecase/sign_up_usecase.dart';
import 'package:zkcnt_pos_app/feature/sign_up/ui/bloc/sign_up_bloc.dart';
import 'package:zkcnt_pos_app/feature/sign_up/ui/sign_up_screen.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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

  static MobileRoute signUp() {
    return MobileRoute(name: 'signUp', path: '/sign-up');
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
  GoRoute(
    name: MobileRouteBuilder.signUp().name,
    path: MobileRouteBuilder.signUp().path,
    builder: (context, state) => BlocProvider(
      create: (context) => SignUpBloc(
        signUpUsecase: SignUpUsecase(
          userRepository: UserRepositoryImpl(
            datasource: UserRemoteDatasource(),
          ),
        ),
      ),
      child: SignUpScreen(),
    ),
  ),
];

class MobileRouteConfig {
  static GoRouter init() {
    return GoRouter(routes: _routes);
  }
}
