part of 'side_menu_bloc.dart';

sealed class SideMenuEvent {}

final class SideMenuLogoutEvent extends SideMenuEvent {}

final class SideMenuNavigateEvent extends SideMenuEvent {
  final String title;
  final DefaultRoute route;

  SideMenuNavigateEvent({required this.title, required this.route});
}
