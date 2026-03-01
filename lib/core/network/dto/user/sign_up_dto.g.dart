// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpDtoCWProxy {
  SignUpDto name(String name);

  SignUpDto email(String email);

  SignUpDto password(String password);

  SignUpDto passwordConfirm(String passwordConfirm);

  SignUpDto storeName(String storeName);

  SignUpDto storeAddress(String storeAddress);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpDto call({
    String name,
    String email,
    String password,
    String passwordConfirm,
    String storeName,
    String storeAddress,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpDto.copyWith(...)` or call `instanceOfSignUpDto.copyWith.fieldName(value)` for a single field.
class _$SignUpDtoCWProxyImpl implements _$SignUpDtoCWProxy {
  const _$SignUpDtoCWProxyImpl(this._value);

  final SignUpDto _value;

  @override
  SignUpDto name(String name) => call(name: name);

  @override
  SignUpDto email(String email) => call(email: email);

  @override
  SignUpDto password(String password) => call(password: password);

  @override
  SignUpDto passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  SignUpDto storeName(String storeName) => call(storeName: storeName);

  @override
  SignUpDto storeAddress(String storeAddress) =>
      call(storeAddress: storeAddress);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpDto call({
    Object? name = const $CopyWithPlaceholder(),
    Object? email = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
    Object? storeName = const $CopyWithPlaceholder(),
    Object? storeAddress = const $CopyWithPlaceholder(),
  }) {
    return SignUpDto(
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

extension $SignUpDtoCopyWith on SignUpDto {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpDto.copyWith(...)` or `instanceOfSignUpDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpDtoCWProxy get copyWith => _$SignUpDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpDto _$SignUpDtoFromJson(Map<String, dynamic> json) => SignUpDto(
  name: json['name'] as String,
  email: json['email'] as String,
  password: json['password'] as String,
  passwordConfirm: json['passwordConfirm'] as String,
  storeName: json['storeName'] as String,
  storeAddress: json['storeAddress'] as String,
);

Map<String, dynamic> _$SignUpDtoToJson(SignUpDto instance) => <String, dynamic>{
  'name': instance.name,
  'email': instance.email,
  'password': instance.password,
  'passwordConfirm': instance.passwordConfirm,
  'storeName': instance.storeName,
  'storeAddress': instance.storeAddress,
};
