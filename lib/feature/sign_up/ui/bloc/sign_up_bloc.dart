import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/usecase/sign_up_usecase.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';

part 'sign_up_event.dart';
part 'sign_up_state.dart';

class SignUpBloc extends Bloc<SignUpEvent, SignUpState> {
  /// Usecase
  final SignUpUsecase signUpUsecase;

  bool isPasswordVisible = false;
  bool isPasswordConfirmVisible = false;

  SignUpBloc({required this.signUpUsecase}) : super(SignUpInitial()) {
    on<SignUpPasswordVisibleEvent>(_onSignUpPasswordVisibleEvent);
    on<SignUpPasswordConfirmVisibleEvent>(_onSignUpPasswordConfirmVisibleEvent);
    on<SignUpSubmitEvent>(_onSignUpSubmitEvent);
  }

  void _onSignUpPasswordVisibleEvent(
    SignUpPasswordVisibleEvent event,
    Emitter<SignUpState> emit,
  ) {
    isPasswordVisible = event.isVisible;
    emit(SignUpPasswordVisible(isVisible: isPasswordVisible));
  }

  void _onSignUpPasswordConfirmVisibleEvent(
    SignUpPasswordConfirmVisibleEvent event,
    Emitter<SignUpState> emit,
  ) {
    isPasswordConfirmVisible = event.isVisible;
    emit(SignUpPasswordConfirmVisible(isVisible: isPasswordConfirmVisible));
  }

  Future<void> _onSignUpSubmitEvent(
    SignUpSubmitEvent event,
    Emitter<SignUpState> emit,
  ) async {
    emit(SignUpLoading());
    try {
      final _ = await signUpUsecase(event.signUpEntity);
      emit(SignUpSuccess());
    } on HTTPException catch (e) {
      emit(SignUpFailure(message: e.message));
    } catch (e) {
      emit(SignUpFailure(message: e.toString()));
    }
  }
}
