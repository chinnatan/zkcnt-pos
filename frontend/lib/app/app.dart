import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:zkcnt_pos_app/app/app_config.dart';
import 'package:zkcnt_pos_app/core/route/mobile_route.dart';
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
        path: 'assets/langs',
        child: buildChild(),
      ),
    );
  }

  Widget buildChild() {
    return MainMobile();
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
      routerConfig: MobileRouteConfig.init(),
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      localizationsDelegates: context.localizationDelegates,
    );
  }
}
