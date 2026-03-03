import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/notifier/auth_notifier.dart';
import 'package:zkcnt_pos_app/core/pocketbase_impl/user_pocketbase_impl.dart';
import 'package:zkcnt_pos_app/feature/main/ui/bloc/side_menu_bloc.dart';
import 'package:zkcnt_pos_app/feature/main/ui/main_screen.dart';
import 'package:zkcnt_pos_app/feature/sale/ui/sale_screen.dart';
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
import 'package:zkcnt_pos_app/helper/app_helper.dart';
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

  static DefaultRoute sale() {
    return DefaultRoute(name: 'sale', path: '/sale');
  }
}

class DefaultRouteGuard {
  static bool isAuthenticated() {
    final pb = PocketBaseHelper.instance.pb;
    final user = AppHelper.getUserInfo();
    if (user != null) {
      pb.authStore.save(user.token, null);
    } else {
      pb.authStore.clear();
    }
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
      GoRoute(
        name: DefaultRouteBuilder.sale().name,
        path: DefaultRouteBuilder.sale().path,
        builder: (context, state) => SaleScreen(),
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

class DefaultRouteConfig {
  static GoRouter init(AuthNotifier authNotifier) {
    final List<String> protectedRoutes = [
      DefaultRouteBuilder.home().path,
      DefaultRouteBuilder.sale().path,
    ];

    return GoRouter(
      initialLocation: authNotifier.isAuthenticated
          ? DefaultRouteBuilder.home().path
          : DefaultRouteBuilder.signIn().path,
      routes: _routes,
      refreshListenable: authNotifier,
      redirect: (context, state) async {
        final isProtected = protectedRoutes.contains(state.fullPath);

        /// if not authenticated, redirect to sign in
        if (!authNotifier.isAuthenticated &&
            protectedRoutes.contains(state.fullPath)) {
          return DefaultRouteBuilder.signIn().path;
        }

        /// if authenticated and not protected, redirect to home
        if (authNotifier.isAuthenticated && !isProtected) {
          return DefaultRouteBuilder.home().path;
        }

        /// if authenticated, redirect to the requested path
        if (authNotifier.isAuthenticated && isProtected) {
          return state.fullPath ?? DefaultRouteBuilder.home().path;
        }

        return null;
      },
    );
  }
}
