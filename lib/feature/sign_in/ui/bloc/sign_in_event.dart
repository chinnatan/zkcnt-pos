part of 'sign_in_bloc.dart';

sealed class SignInEvent {}

final class SignInSubmitEvent extends SignInEvent {
  final String email;
  final String password;

  SignInSubmitEvent({required this.email, required this.password});
}
