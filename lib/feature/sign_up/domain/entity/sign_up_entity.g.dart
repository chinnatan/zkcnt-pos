// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_entity.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpEntityCWProxy {
  SignUpEntity name(String name);

  SignUpEntity email(String email);

  SignUpEntity password(String password);

  SignUpEntity passwordConfirm(String passwordConfirm);

  SignUpEntity storeName(String storeName);

  SignUpEntity storeAddress(String storeAddress);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpEntity call({
    String name,
    String email,
    String password,
    String passwordConfirm,
    String storeName,
    String storeAddress,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpEntity.copyWith(...)` or call `instanceOfSignUpEntity.copyWith.fieldName(value)` for a single field.
class _$SignUpEntityCWProxyImpl implements _$SignUpEntityCWProxy {
  const _$SignUpEntityCWProxyImpl(this._value);

  final SignUpEntity _value;

  @override
  SignUpEntity name(String name) => call(name: name);

  @override
  SignUpEntity email(String email) => call(email: email);

  @override
  SignUpEntity password(String password) => call(password: password);

  @override
  SignUpEntity passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  SignUpEntity storeName(String storeName) => call(storeName: storeName);

  @override
  SignUpEntity storeAddress(String storeAddress) =>
      call(storeAddress: storeAddress);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpEntity call({
    Object? name = const $CopyWithPlaceholder(),
    Object? email = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
    Object? storeName = const $CopyWithPlaceholder(),
    Object? storeAddress = const $CopyWithPlaceholder(),
  }) {
    return SignUpEntity(
      name: name == const $CopyWithPlaceholder() || name == null
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      email: email == const $CopyWithPlaceholder() || email == null
          ? _value.email
          // ignore: cast_nullable_to_non_nullable
          : email as String,
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
      storeName: storeName == const $CopyWithPlaceholder() || storeName == null
          ? _value.storeName
          // ignore: cast_nullable_to_non_nullable
          : storeName as String,
      storeAddress:
          storeAddress == const $CopyWithPlaceholder() || storeAddress == null
          ? _value.storeAddress
          // ignore: cast_nullable_to_non_nullable
          : storeAddress as String,
    );
  }
}

extension $SignUpEntityCopyWith on SignUpEntity {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpEntity.copyWith(...)` or `instanceOfSignUpEntity.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpEntityCWProxy get copyWith => _$SignUpEntityCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpEntity _$SignUpEntityFromJson(Map<String, dynamic> json) => SignUpEntity(
  name: json['name'] as String,
  email: json['email'] as String,
  password: json['password'] as String,
  passwordConfirm: json['passwordConfirm'] as String,
  storeName: json['storeName'] as String,
  storeAddress: json['storeAddress'] as String,
);

Map<String, dynamic> _$SignUpEntityToJson(SignUpEntity instance) =>
    <String, dynamic>{
      'name': instance.name,
      'email': instance.email,
      'password': instance.password,
      'passwordConfirm': instance.passwordConfirm,
      'storeName': instance.storeName,
      'storeAddress': instance.storeAddress,
    };
