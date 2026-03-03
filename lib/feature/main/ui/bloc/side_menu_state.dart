part of 'side_menu_bloc.dart';

sealed class SideMenuState {}

final class SideMenuInitial extends SideMenuState {}

final class SideMenuLogoutLoading extends SideMenuState {}

final class SideMenuLogoutFailure extends SideMenuState {}

final class SideMenuLogoutSuccess extends SideMenuState {}

final class SideMenuNavigateLoading extends SideMenuState {}

final class SideMenuNavigateFailure extends SideMenuState {}

final class SideMenuNavigateSuccess extends SideMenuState {
  final String currentTitle;
  final DefaultRoute currentRoute;

  SideMenuNavigateSuccess({
    required this.currentTitle,
    required this.currentRoute,
  });
}
