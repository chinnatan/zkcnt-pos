import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';
import 'package:zkcnt_pos_app/core/constant/duration_const.dart';

class NotifyHelper {
  static late NotifyHelper _instance;

  final Toastification toastification;

  NotifyHelper._internal({required this.toastification});

  factory NotifyHelper({required Toastification toastification}) {
    _instance = NotifyHelper._internal(toastification: toastification);
    return _instance;
  }

  static NotifyHelper get instance => _instance;

  static NotifyHelper init({required Toastification toastification}) {
    _instance = NotifyHelper._internal(toastification: toastification);
    return _instance;
  }

  void show(
    BuildContext ctx,
    String message, {
    IconData icon = Icons.info,
    ToastificationType type = ToastificationType.info,
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: ctx,
      type: type,
      style: ToastificationStyle.flat,
      autoCloseDuration: DurationConst.short,
      description: Text(message),
      alignment: alignment,
      icon: Icon(icon),
    );
  }

  void showSuccess(BuildContext ctx, String message) {
    show(
      ctx,
      message,
      icon: Icons.check_circle,
      type: ToastificationType.success,
    );
  }

  void showError(BuildContext ctx, String message) {
    show(ctx, message, icon: Icons.error, type: ToastificationType.error);
  }

  void showWarning(BuildContext ctx, String message) {
    show(ctx, message, icon: Icons.warning, type: ToastificationType.warning);
  }

  void showInfo(BuildContext ctx, String message) {
    show(ctx, message, icon: Icons.info, type: ToastificationType.info);
  }
}
