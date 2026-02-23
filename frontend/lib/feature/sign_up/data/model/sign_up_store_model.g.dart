// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_store_model.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpStoreModelCWProxy {
  SignUpStoreModel name(String name);

  SignUpStoreModel address(String address);

  SignUpStoreModel createdId(String createdId);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreModel call({String name, String address, String createdId});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpStoreModel.copyWith(...)` or call `instanceOfSignUpStoreModel.copyWith.fieldName(value)` for a single field.
class _$SignUpStoreModelCWProxyImpl implements _$SignUpStoreModelCWProxy {
  const _$SignUpStoreModelCWProxyImpl(this._value);

  final SignUpStoreModel _value;

  @override
  SignUpStoreModel name(String name) => call(name: name);

  @override
  SignUpStoreModel address(String address) => call(address: address);

  @override
  SignUpStoreModel createdId(String createdId) => call(createdId: createdId);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreModel(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreModel(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreModel call({
    Object? name = const $CopyWithPlaceholder(),
    Object? address = const $CopyWithPlaceholder(),
    Object? createdId = const $CopyWithPlaceholder(),
  }) {
    return SignUpStoreModel(
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

extension $SignUpStoreModelCopyWith on SignUpStoreModel {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpStoreModel.copyWith(...)` or `instanceOfSignUpStoreModel.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpStoreModelCWProxy get copyWith => _$SignUpStoreModelCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpStoreModel _$SignUpStoreModelFromJson(Map<String, dynamic> json) =>
    SignUpStoreModel(
      name: json['name'] as String,
      address: json['address'] as String,
      createdId: json['createdId'] as String,
    );

Map<String, dynamic> _$SignUpStoreModelToJson(SignUpStoreModel instance) =>
    <String, dynamic>{
      'name': instance.name,
      'address': instance.address,
      'createdId': instance.createdId,
    };
