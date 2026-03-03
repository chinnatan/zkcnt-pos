import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/pocketbase_impl/user_pocketbase_impl.dart';
import 'package:zkcnt_pos_app/feature/main/ui/bloc/side_menu_bloc.dart';
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

class DefaultRoute {
  final String name;
  final String path;

  DefaultRoute({required this.name, required this.path});
}

class DefaultRouteBuilder {
  static DefaultRoute home() {
    return DefaultRoute(name: 'home', path: '/');
  }

  static DefaultRoute signIn() {
    return DefaultRoute(name: 'signIn', path: '/sign-in');
  }

  static DefaultRoute signUp() {
    return DefaultRoute(name: 'signUp', path: '/sign-up');
  }
}

class DefaultRouteGuard {
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
  ShellRoute(
    builder: (context, state, child) => MultiBlocProvider(
      providers: [BlocProvider(create: (context) => SideMenuBloc())],
      child: MainScreen(title: LocaleKeyConst.appName.tr(), child: child),
    ),
    routes: [
      GoRoute(
        name: DefaultRouteBuilder.home().name,
        path: DefaultRouteBuilder.home().path,
        builder: (context, state) => Text(LocaleKeyConst.sideMenuHome.tr()),
      ),
    ],
  ),
  GoRoute(
    name: DefaultRouteBuilder.signIn().name,
    path: DefaultRouteBuilder.signIn().path,
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
    name: DefaultRouteBuilder.signUp().name,
    path: DefaultRouteBuilder.signUp().path,
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

final _protectedRoutes = [DefaultRouteBuilder.home().name];

class DefaultRouteConfig {
  static GoRouter init() {
    return GoRouter(
      initialLocation: DefaultRouteGuard.isAuthenticated()
          ? DefaultRouteBuilder.home().path
          : DefaultRouteBuilder.signIn().path,
      routes: _routes,
      redirect: (context, state) async {
        if (_protectedRoutes.contains(state.name)) {
          if (DefaultRouteGuard.isAuthenticated()) {
            return DefaultRouteBuilder.home().path;
          } else {
            final isRefreshed = await DefaultRouteGuard.refreshAuth();
            if (isRefreshed) {
              return DefaultRouteBuilder.home().path;
            } else {
              return DefaultRouteBuilder.signIn().path;
            }
          }
        }
        return null;
      },
    );
  }
}
