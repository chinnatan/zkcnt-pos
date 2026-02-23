// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_store_entity.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpStoreEntityCWProxy {
  SignUpStoreEntity name(String name);

  SignUpStoreEntity address(String address);

  SignUpStoreEntity createdId(String createdId);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreEntity call({String name, String address, String createdId});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpStoreEntity.copyWith(...)` or call `instanceOfSignUpStoreEntity.copyWith.fieldName(value)` for a single field.
class _$SignUpStoreEntityCWProxyImpl implements _$SignUpStoreEntityCWProxy {
  const _$SignUpStoreEntityCWProxyImpl(this._value);

  final SignUpStoreEntity _value;

  @override
  SignUpStoreEntity name(String name) => call(name: name);

  @override
  SignUpStoreEntity address(String address) => call(address: address);

  @override
  SignUpStoreEntity createdId(String createdId) => call(createdId: createdId);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreEntity(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreEntity(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreEntity call({
    Object? name = const $CopyWithPlaceholder(),
    Object? address = const $CopyWithPlaceholder(),
    Object? createdId = const $CopyWithPlaceholder(),
  }) {
    return SignUpStoreEntity(
      name: name == const $CopyWithPlaceholder() || name == null
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      address: address == const $CopyWithPlaceholder() || address == null
          ? _value.address
          // ignore: cast_nullable_to_non_nullable
          : address as String,
      createdId: createdId == const $CopyWithPlaceholder() || createdId == null
          ? _value.createdId
          // ignore: cast_nullable_to_non_nullable
          : createdId as String,
    );
  }
}

extension $SignUpStoreEntityCopyWith on SignUpStoreEntity {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpStoreEntity.copyWith(...)` or `instanceOfSignUpStoreEntity.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpStoreEntityCWProxy get copyWith =>
      _$SignUpStoreEntityCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpStoreEntity _$SignUpStoreEntityFromJson(Map<String, dynamic> json) =>
    SignUpStoreEntity(
      name: json['name'] as String,
      address: json['address'] as String,
      createdId: json['createdId'] as String,
    );

Map<String, dynamic> _$SignUpStoreEntityToJson(SignUpStoreEntity instance) =>
    <String, dynamic>{
      'name': instance.name,
      'address': instance.address,
      'createdId': instance.createdId,
    };
