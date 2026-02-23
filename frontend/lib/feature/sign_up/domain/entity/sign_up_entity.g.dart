// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_entity.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpEntityCWProxy {
  SignUpEntity user(SignUpUserEntity user);

  SignUpEntity store(SignUpStoreEntity store);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpEntity call({SignUpUserEntity user, SignUpStoreEntity store});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpEntity.copyWith(...)` or call `instanceOfSignUpEntity.copyWith.fieldName(value)` for a single field.
class _$SignUpEntityCWProxyImpl implements _$SignUpEntityCWProxy {
  const _$SignUpEntityCWProxyImpl(this._value);

  final SignUpEntity _value;

  @override
  SignUpEntity user(SignUpUserEntity user) => call(user: user);

  @override
  SignUpEntity store(SignUpStoreEntity store) => call(store: store);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpEntity call({
    Object? user = const $CopyWithPlaceholder(),
    Object? store = const $CopyWithPlaceholder(),
  }) {
    return SignUpEntity(
      user: user == const $CopyWithPlaceholder() || user == null
          ? _value.user
          // ignore: cast_nullable_to_non_nullable
          : user as SignUpUserEntity,
      store: store == const $CopyWithPlaceholder() || store == null
          ? _value.store
          // ignore: cast_nullable_to_non_nullable
          : store as SignUpStoreEntity,
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
  user: SignUpUserEntity.fromJson(json['user'] as Map<String, dynamic>),
  store: SignUpStoreEntity.fromJson(json['store'] as Map<String, dynamic>),
);

Map<String, dynamic> _$SignUpEntityToJson(SignUpEntity instance) =>
    <String, dynamic>{'user': instance.user, 'store': instance.store};
