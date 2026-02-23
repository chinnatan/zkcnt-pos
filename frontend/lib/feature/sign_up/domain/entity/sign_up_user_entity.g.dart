// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_user_entity.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpUserEntityCWProxy {
  SignUpUserEntity email(String email);

  SignUpUserEntity name(String name);

  SignUpUserEntity password(String password);

  SignUpUserEntity passwordConfirm(String passwordConfirm);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserEntity call({
    String email,
    String name,
    String password,
    String passwordConfirm,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpUserEntity.copyWith(...)` or call `instanceOfSignUpUserEntity.copyWith.fieldName(value)` for a single field.
class _$SignUpUserEntityCWProxyImpl implements _$SignUpUserEntityCWProxy {
  const _$SignUpUserEntityCWProxyImpl(this._value);

  final SignUpUserEntity _value;

  @override
  SignUpUserEntity email(String email) => call(email: email);

  @override
  SignUpUserEntity name(String name) => call(name: name);

  @override
  SignUpUserEntity password(String password) => call(password: password);

  @override
  SignUpUserEntity passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpUserEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpUserEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpUserEntity call({
    Object? email = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
  }) {
    return SignUpUserEntity(
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

extension $SignUpUserEntityCopyWith on SignUpUserEntity {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpUserEntity.copyWith(...)` or `instanceOfSignUpUserEntity.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpUserEntityCWProxy get copyWith => _$SignUpUserEntityCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpUserEntity _$SignUpUserEntityFromJson(Map<String, dynamic> json) =>
    SignUpUserEntity(
      email: json['email'] as String,
      name: json['name'] as String,
      password: json['password'] as String,
      passwordConfirm: json['passwordConfirm'] as String,
    );

Map<String, dynamic> _$SignUpUserEntityToJson(SignUpUserEntity instance) =>
    <String, dynamic>{
      'email': instance.email,
      'name': instance.name,
      'password': instance.password,
      'passwordConfirm': instance.passwordConfirm,
    };
