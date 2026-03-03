import 'package:flutter/material.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/widget/main/side_menu_widget.dart';
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
        child: Row(
          children: [
            if (ScreenSizeHelper.isDesktop(context) ||
                ScreenSizeHelper.isTablet(context))
              Expanded(flex: DimensionConst.flex2, child: SideMenuWidget()),
            Expanded(flex: DimensionConst.flex9, child: widget.child),
          ],
        ),
      ),
    );
  }
}
