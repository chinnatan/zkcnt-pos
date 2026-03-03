part of 'side_menu_bloc.dart';

sealed class SideMenuState {}

final class SideMenuInitial extends SideMenuState {}

final class SideMenuLogoutLoading extends SideMenuState {}

final class SideMenuLogoutFailure extends SideMenuState {}

final class SideMenuLogoutSuccess extends SideMenuState {}
