// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_model.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpModelCWProxy {
  SignUpModel user(SignUpUserModel user);

  SignUpModel store(SignUpStoreModel store);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpModel call({SignUpUserModel user, SignUpStoreModel store});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpModel.copyWith(...)` or call `instanceOfSignUpModel.copyWith.fieldName(value)` for a single field.
class _$SignUpModelCWProxyImpl implements _$SignUpModelCWProxy {
  const _$SignUpModelCWProxyImpl(this._value);

  final SignUpModel _value;

  @override
  SignUpModel user(SignUpUserModel user) => call(user: user);

  @override
  SignUpModel store(SignUpStoreModel store) => call(store: store);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpModel call({
    Object? user = const $CopyWithPlaceholder(),
    Object? store = const $CopyWithPlaceholder(),
  }) {
    return SignUpModel(
      user: user == const $CopyWithPlaceholder() || user == null
          ? _value.user
          // ignore: cast_nullable_to_non_nullable
          : user as SignUpUserModel,
      store: store == const $CopyWithPlaceholder() || store == null
          ? _value.store
          // ignore: cast_nullable_to_non_nullable
          : store as SignUpStoreModel,
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
  user: SignUpUserModel.fromJson(json['user'] as Map<String, dynamic>),
  store: SignUpStoreModel.fromJson(json['store'] as Map<String, dynamic>),
);

Map<String, dynamic> _$SignUpModelToJson(SignUpModel instance) =>
    <String, dynamic>{'user': instance.user, 'store': instance.store};
