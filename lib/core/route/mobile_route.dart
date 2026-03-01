import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/core/pocketbase_impl/user_pocketbase_impl.dart';
import 'package:zkcnt_pos_app/feature/main/ui/main_screen.dart';
import 'package:zkcnt_pos_app/feature/sign_in/data/datasource/user_pocketbase_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_in/data/repository/user_pocketbase_repository_impl.dart';
import 'package:zkcnt_pos_app/feature/sign_in/domain/usecase/sign_in_usecase.dart';
import 'package:zkcnt_pos_app/feature/sign_in/ui/bloc/sign_in_bloc.dart';
import 'package:zkcnt_pos_app/feature/sign_in/ui/sign_in_screen.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/datasource/user_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/repository/user_repository_impl.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/usecase/sign_up_usecase.dart';
import 'package:zkcnt_pos_app/feature/sign_up/ui/bloc/sign_up_bloc.dart';
import 'package:zkcnt_pos_app/feature/sign_up/ui/sign_up_screen.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

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

class MobileRouteGuard {
  static bool isAuthenticated() {
    final pb = PocketBaseHelper.instance.pb;
    return pb.authStore.isValid;
  }

  static bool isNotAuthenticated() {
    final pb = PocketBaseHelper.instance.pb;
    return !pb.authStore.isValid;
  }

  static Future<bool> refreshAuth() async {
    final pb = PocketBaseHelper.instance.pb;
    try {
      await pb.collection(LocalDBConst.users).authRefresh();
      return true;
    } catch (e) {
      return false;
    }
  }
}

final _routes = [
  GoRoute(
    name: MobileRouteBuilder.home().name,
    path: MobileRouteBuilder.home().path,
    builder: (context, state) => MainScreen(),
  ),
  GoRoute(
    name: MobileRouteBuilder.signIn().name,
    path: MobileRouteBuilder.signIn().path,
    builder: (context, state) => BlocProvider(
      create: (context) => SignInBloc(
        signInUsecase: SignInUsecase(
          userPocketbaseRepository: UserPocketbaseRepositoryImpl(
            datasource: UserPocketbaseRemoteDatasource(
              userPocketbase: UserPocketbaseImpl(),
            ),
          ),
        ),
      ),
      child: SignInScreen(),
    ),
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

final _protectedRoutes = [MobileRouteBuilder.home().name];

class MobileRouteConfig {
  static GoRouter init() {
    return GoRouter(
      initialLocation: MobileRouteGuard.isAuthenticated()
          ? MobileRouteBuilder.home().path
          : MobileRouteBuilder.signIn().path,
      routes: _routes,
      redirect: (context, state) async {
        if (_protectedRoutes.contains(state.name)) {
          if (MobileRouteGuard.isAuthenticated()) {
            return MobileRouteBuilder.home().path;
          } else {
            final isRefreshed = await MobileRouteGuard.refreshAuth();
            if (isRefreshed) {
              return MobileRouteBuilder.home().path;
            } else {
              return MobileRouteBuilder.signIn().path;
            }
          }
        }
        return null;
      },
    );
  }
}
