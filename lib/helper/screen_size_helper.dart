import 'package:flutter/material.dart';
import 'package:responsiveness/responsiveness.dart';

class ScreenSizeHelper {
  static ScreenSize getScreenSize(BuildContext context) {
    return ScreenSize.of(context);
  }

  static bool isMobile(BuildContext context) {
    return getScreenSize(context) == ScreenSize.xs;
  }

  static bool isTablet(BuildContext context) {
    return getScreenSize(context) == ScreenSize.sm;
  }

  static bool isDesktop(BuildContext context) {
    return getScreenSize(context) == ScreenSize.md ||
        getScreenSize(context) == ScreenSize.lg ||
        getScreenSize(context) == ScreenSize.xl ||
        getScreenSize(context) == ScreenSize.xxl;
  }
}
