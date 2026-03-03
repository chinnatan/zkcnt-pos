import 'package:flutter_bloc/flutter_bloc.dart';

part 'side_menu_event.dart';
part 'side_menu_state.dart';

class SideMenuBloc extends Bloc<SideMenuEvent, SideMenuState> {
  SideMenuBloc() : super(SideMenuInitial()) {
    on<SideMenuEvent>((event, emit) {
      // TODO: implement event handler
    });
  }
}
