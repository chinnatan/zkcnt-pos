part of 'sign_up_bloc.dart';

sealed class SignUpState {}

final class SignUpInitial extends SignUpState {}

final class SignUpLoading extends SignUpState {}

final class SignUpSuccess extends SignUpState {}

final class SignUpFailure extends SignUpState {
  final String message;

  SignUpFailure({required this.message});
}

final class SignUpPasswordVisible extends SignUpState {
  final bool isVisible;

  SignUpPasswordVisible({required this.isVisible});
}

final class SignUpPasswordConfirmVisible extends SignUpState {
  final bool isVisible;

  SignUpPasswordConfirmVisible({required this.isVisible});
}
