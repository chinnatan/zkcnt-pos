import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:responsive_breakpoints/breakpoints/material_ui_breakpoint.dart';
import 'package:responsive_breakpoints/extensions_theme.dart';
import 'package:toastification/toastification.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/core/notifier/auth_notifier.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';
import 'package:zkcnt_pos_app/theme/theme.dart';
import 'package:zkcnt_pos_app/theme/util.dart';

class MainAppLocalization extends StatelessWidget {
  const MainAppLocalization({super.key});

  @override
  Widget build(BuildContext context) {
    return GlobalLoaderOverlay(
      child: EasyLocalization(
        supportedLocales: const [Locale('th'), Locale('en')],
        startLocale: const Locale('th'),
        fallbackLocale: const Locale('th'),
        path: 'langs',
        child: ToastificationWrapper(child: buildChild()),
      ),
    );
  }

  Widget buildChild() {
    if (kIsWeb) {
      return MainWeb();
    } else if (Platform.isAndroid || Platform.isIOS) {
      return MainMobile();
    } else {
      return MainWeb();
    }
  }
}

class MainWeb extends StatefulWidget {
  const MainWeb({super.key});

  @override
  State<MainWeb> createState() => _MainWebState();
}

class _MainWebState extends State<MainWeb> {
  @override
  Widget build(BuildContext context) {
    final brightness = View.of(context).platformDispatcher.platformBrightness;

    // Use with Google Fonts package to use downloadable fonts
    TextTheme textTheme = createTextTheme(context, "Kanit", "Kanit");

    MaterialTheme theme = MaterialTheme(textTheme);

    return MaterialApp.router(
      debugShowCheckedModeBanner: AppConfig.isDev(),
      title: "zKCNT POS",
      theme: brightness == Brightness.light ? theme.light() : theme.dark(),
      routerConfig: DefaultRouteConfig.init(AuthNotifier()),
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      localizationsDelegates: context.localizationDelegates,
    );
  }
}

class MainMobile extends StatefulWidget {
  const MainMobile({super.key});

  @override
  State<MainMobile> createState() => _MainMobileState();
}

class _MainMobileState extends State<MainMobile> {
  @override
  Widget build(BuildContext context) {
    final brightness = View.of(context).platformDispatcher.platformBrightness;

    // Use with Google Fonts package to use downloadable fonts
    TextTheme textTheme = createTextTheme(context, "Kanit", "Kanit");

    MaterialTheme theme = MaterialTheme(textTheme);

    return MaterialApp.router(
      debugShowCheckedModeBanner: AppConfig.isDev(),
      title: "zKCNT POS",
      theme: brightness == Brightness.light ? theme.light() : theme.dark(),
      routerConfig: DefaultRouteConfig.init(AuthNotifier()),
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      localizationsDelegates: context.localizationDelegates,
    );
  }
}
