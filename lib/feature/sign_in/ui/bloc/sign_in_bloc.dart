import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:zkcnt_pos_app/core/constant/local_storage_key_const.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/feature/sign_in/domain/usecase/sign_in_usecase.dart';
import 'package:zkcnt_pos_app/helper/local_storage_helper.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';

part 'sign_in_event.dart';
part 'sign_in_state.dart';

class SignInBloc extends Bloc<SignInEvent, SignInState> {
  /// Usecase
  final SignInUsecase signInUsecase;

  SignInBloc({required this.signInUsecase}) : super(SignInInitial()) {
    on<SignInSubmitEvent>(_onSignInSubmitEvent);
  }

  Future<void> _onSignInSubmitEvent(
    SignInSubmitEvent event,
    Emitter<SignInState> emit,
  ) async {
    emit(SignInLoading());
    try {
      final userInfo = await signInUsecase(event.email, event.password);

      await LocalStorageHelper.instance.setObject(
        LocalStorageKeyConst.userInfo,
        userInfo,
      );

      emit(SignInSuccess());
    } on HTTPException catch (e) {
      emit(SignInFailure(message: e.message));
    } catch (e) {
      LogHelper.e(e.toString(), error: e, stackTrace: StackTrace.current);
      emit(SignInFailure(message: e.toString()));
    }
  }
}
