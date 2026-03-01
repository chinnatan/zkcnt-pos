// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_model.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpModelCWProxy {
  SignUpModel name(String name);

  SignUpModel email(String email);

  SignUpModel password(String password);

  SignUpModel passwordConfirm(String passwordConfirm);

  SignUpModel storeName(String storeName);

  SignUpModel storeAddress(String storeAddress);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpModel call({
    String name,
    String email,
    String password,
    String passwordConfirm,
    String storeName,
    String storeAddress,
  });
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpModel.copyWith(...)` or call `instanceOfSignUpModel.copyWith.fieldName(value)` for a single field.
class _$SignUpModelCWProxyImpl implements _$SignUpModelCWProxy {
  const _$SignUpModelCWProxyImpl(this._value);

  final SignUpModel _value;

  @override
  SignUpModel name(String name) => call(name: name);

  @override
  SignUpModel email(String email) => call(email: email);

  @override
  SignUpModel password(String password) => call(password: password);

  @override
  SignUpModel passwordConfirm(String passwordConfirm) =>
      call(passwordConfirm: passwordConfirm);

  @override
  SignUpModel storeName(String storeName) => call(storeName: storeName);

  @override
  SignUpModel storeAddress(String storeAddress) =>
      call(storeAddress: storeAddress);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpModel call({
    Object? name = const $CopyWithPlaceholder(),
    Object? email = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? passwordConfirm = const $CopyWithPlaceholder(),
    Object? storeName = const $CopyWithPlaceholder(),
    Object? storeAddress = const $CopyWithPlaceholder(),
  }) {
    return SignUpModel(
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

extension $SignUpModelCopyWith on SignUpModel {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpModel.copyWith(...)` or `instanceOfSignUpModel.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpModelCWProxy get copyWith => _$SignUpModelCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpModel _$SignUpModelFromJson(Map<String, dynamic> json) => SignUpModel(
  name: json['name'] as String,
  email: json['email'] as String,
  password: json['password'] as String,
  passwordConfirm: json['passwordConfirm'] as String,
  storeName: json['storeName'] as String,
  storeAddress: json['storeAddress'] as String,
);

Map<String, dynamic> _$SignUpModelToJson(SignUpModel instance) =>
    <String, dynamic>{
      'name': instance.name,
      'email': instance.email,
      'password': instance.password,
      'passwordConfirm': instance.passwordConfirm,
      'storeName': instance.storeName,
      'storeAddress': instance.storeAddress,
    };
