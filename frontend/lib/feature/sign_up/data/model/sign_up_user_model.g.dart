// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_user_model.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpUserModelCWProxy {
  SignUpUserModel email(String email);

  SignUpUserModel name(String name);

  SignUpUserModel password(String password);

  SignUpUserModel passwordConfirm(String passwordConfirm);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserModel call({
    String email,
    String name,
    String password,
    String passwordConfirm,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpUserModel.copyWith(...)` or call `instanceOfSignUpUserModel.copyWith.fieldName(value)` for a single field.
class _$SignUpUserModelCWProxyImpl implements _$SignUpUserModelCWProxy {
  const _$SignUpUserModelCWProxyImpl(this._value);

  final SignUpUserModel _value;

  @override
  SignUpUserModel email(String email) => call(email: email);

  @override
  SignUpUserModel name(String name) => call(name: name);

  @override
  SignUpUserModel password(String password) => call(password: password);

  @override
  SignUpUserModel passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserModel call({
    Object? email = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
  }) {
    return SignUpUserModel(
      email: email == const $CopyWithPlaceholder() || email == null
          ? _value.email
          // ignore: cast_nullable_to_non_nullable
          : email as String,
      name: name == const $CopyWithPlaceholder() || name == null
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      password: password == const $CopyWithPlaceholder() || password == null
          ? _value.password
          // ignore: cast_nullable_to_non_nullable
          : password as String,
      passwordConfirm:
          passwordConfirm == const $CopyWithPlaceholder() ||
              passwordConfirm == null
          ? _value.passwordConfirm
          // ignore: cast_nullable_to_non_nullable
          : passwordConfirm as String,
    );
  }
}

extension $SignUpUserModelCopyWith on SignUpUserModel {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpUserModel.copyWith(...)` or `instanceOfSignUpUserModel.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpUserModelCWProxy get copyWith => _$SignUpUserModelCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpUserModel _$SignUpUserModelFromJson(Map<String, dynamic> json) =>
    SignUpUserModel(
      email: json['email'] as String,
      name: json['name'] as String,
      password: json['password'] as String,
      passwordConfirm: json['passwordConfirm'] as String,
    );

Map<String, dynamic> _$SignUpUserModelToJson(SignUpUserModel instance) =>
    <String, dynamic>{
      'email': instance.email,
      'name': instance.name,
      'password': instance.password,
      'passwordConfirm': instance.passwordConfirm,
    };
