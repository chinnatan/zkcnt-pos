import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';
import 'package:zkcnt_pos_app/helper/local_storage_helper.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

part 'side_menu_event.dart';
part 'side_menu_state.dart';

class SideMenuBloc extends Bloc<SideMenuEvent, SideMenuState> {
  /// Variable
  String currentTitle = LocaleKeyConst.sideMenuHome.tr();
  DefaultRoute currentRoute = DefaultRouteBuilder.home();

  SideMenuBloc() : super(SideMenuInitial()) {
    on<SideMenuLogoutEvent>(_onSideMenuLogoutEvent);
    on<SideMenuNavigateEvent>(_onSideMenuNavigateEvent);
  }

  Future<void> _onSideMenuLogoutEvent(
    SideMenuLogoutEvent event,
    Emitter<SideMenuState> emit,
  ) async {
    try {
      emit(SideMenuLogoutLoading());
      PocketBaseHelper.instance.pb.authStore.clear();
      await LocalStorageHelper.instance.clearAll();
      emit(SideMenuLogoutSuccess());
    } catch (e) {
      LogHelper.e(e.toString(), error: e, stackTrace: StackTrace.current);
      emit(SideMenuLogoutFailure());
    }
  }

  Future<void> _onSideMenuNavigateEvent(
    SideMenuNavigateEvent event,
    Emitter<SideMenuState> emit,
  ) async {
    try {
      emit(SideMenuNavigateLoading());
      currentRoute = event.route;
      currentTitle = event.title;
      emit(
        SideMenuNavigateSuccess(
          currentTitle: currentTitle,
          currentRoute: currentRoute,
        ),
      );
    } catch (e) {
      LogHelper.e(e.toString(), error: e, stackTrace: StackTrace.current);
      emit(SideMenuNavigateFailure());
    }
  }
}
