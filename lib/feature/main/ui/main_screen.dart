import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';
import 'package:zkcnt_pos_app/core/widget/main/side_menu_widget.dart';
import 'package:zkcnt_pos_app/feature/main/ui/bloc/side_menu_bloc.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';
import 'package:zkcnt_pos_app/helper/notify_helper.dart';
import 'package:zkcnt_pos_app/helper/screen_size_helper.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key, required this.child, required this.title});

  /// Title
  final String title;

  /// Widget
  final Widget child;

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: SideMenuWidget(),
      appBar: ScreenSizeHelper.isMobile(context)
          ? AppBar(title: Text(widget.title))
          : null,
      body: SafeArea(
        child: MultiBlocListener(
          listeners: [
            BlocListener<SideMenuBloc, SideMenuState>(
              listener: (context, state) {
                try {
                  if (state is SideMenuLogoutLoading) {
                    context.loaderOverlay.show();
                  } else if (state is SideMenuLogoutSuccess) {
                    context.goNamed(DefaultRouteBuilder.signIn().name);
                  } else if (state is SideMenuLogoutFailure) {
                    NotifyHelper.instance.showError(context, "Logout failed");
                  }
                } catch (e) {
                  LogHelper.e(
                    e.toString(),
                    error: e,
                    stackTrace: StackTrace.current,
                  );
                } finally {
                  context.loaderOverlay.hide();
                }
              },
            ),
          ],
          child: Row(
            children: [
              if (ScreenSizeHelper.isDesktop(context) ||
                  ScreenSizeHelper.isTablet(context))
                Expanded(flex: DimensionConst.flex2, child: SideMenuWidget()),
              Expanded(flex: DimensionConst.flex9, child: widget.child),
            ],
          ),
        ),
      ),
    );
  }
}
