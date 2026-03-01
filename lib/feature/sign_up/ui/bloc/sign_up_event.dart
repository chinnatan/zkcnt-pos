part of 'sign_up_bloc.dart';

sealed class SignUpEvent {}

final class SignUpSubmitEvent extends SignUpEvent {
  final SignUpEntity signUpEntity;

  SignUpSubmitEvent({required this.signUpEntity});
}

final class SignUpPasswordVisibleEvent extends SignUpEvent {
  final bool isVisible;

  SignUpPasswordVisibleEvent({required this.isVisible});
}

final class SignUpPasswordConfirmVisibleEvent extends SignUpEvent {
  final bool isVisible;

  SignUpPasswordConfirmVisibleEvent({required this.isVisible});
}
