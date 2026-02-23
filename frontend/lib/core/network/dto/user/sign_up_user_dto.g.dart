// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_user_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpUserDtoCWProxy {
  SignUpUserDto email(String email);

  SignUpUserDto name(String name);

  SignUpUserDto password(String password);

  SignUpUserDto passwordConfirm(String passwordConfirm);

  SignUpUserDto role(String role);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserDto call({
    String email,
    String name,
    String password,
    String passwordConfirm,
    String role,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpUserDto.copyWith(...)` or call `instanceOfSignUpUserDto.copyWith.fieldName(value)` for a single field.
class _$SignUpUserDtoCWProxyImpl implements _$SignUpUserDtoCWProxy {
  const _$SignUpUserDtoCWProxyImpl(this._value);

  final SignUpUserDto _value;

  @override
  SignUpUserDto email(String email) => call(email: email);

  @override
  SignUpUserDto name(String name) => call(name: name);

  @override
  SignUpUserDto password(String password) => call(password: password);

  @override
  SignUpUserDto passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  SignUpUserDto role(String role) => call(role: role);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserDto call({
    Object? email = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
    Object? role = const $CopyWithPlaceholder(),
  }) {
    return SignUpUserDto(
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
      role: role == const $CopyWithPlaceholder() || role == null
          ? _value.role
          // ignore: cast_nullable_to_non_nullable
          : role as String,
    );
  }
}

extension $SignUpUserDtoCopyWith on SignUpUserDto {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpUserDto.copyWith(...)` or `instanceOfSignUpUserDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpUserDtoCWProxy get copyWith => _$SignUpUserDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpUserDto _$SignUpUserDtoFromJson(Map<String, dynamic> json) =>
    SignUpUserDto(
      email: json['email'] as String,
      name: json['name'] as String,
      password: json['password'] as String,
      passwordConfirm: json['passwordConfirm'] as String,
      role: json['role'] as String? ?? 'admin',
    );

Map<String, dynamic> _$SignUpUserDtoToJson(SignUpUserDto instance) =>
    <String, dynamic>{
      'email': instance.email,
      'name': instance.name,
      'password': instance.password,
      'passwordConfirm': instance.passwordConfirm,
      'role': instance.role,
    };
