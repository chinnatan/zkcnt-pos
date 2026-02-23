// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_store_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpStoreDtoCWProxy {
  SignUpStoreDto name(String name);

  SignUpStoreDto address(String address);

  SignUpStoreDto createdId(String createdId);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreDto call({String name, String address, String createdId});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpStoreDto.copyWith(...)` or call `instanceOfSignUpStoreDto.copyWith.fieldName(value)` for a single field.
class _$SignUpStoreDtoCWProxyImpl implements _$SignUpStoreDtoCWProxy {
  const _$SignUpStoreDtoCWProxyImpl(this._value);

  final SignUpStoreDto _value;

  @override
  SignUpStoreDto name(String name) => call(name: name);

  @override
  SignUpStoreDto address(String address) => call(address: address);

  @override
  SignUpStoreDto createdId(String createdId) => call(createdId: createdId);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpStoreDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpStoreDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpStoreDto call({
    Object? name = const $CopyWithPlaceholder(),
    Object? address = const $CopyWithPlaceholder(),
    Object? createdId = const $CopyWithPlaceholder(),
  }) {
    return SignUpStoreDto(
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

extension $SignUpStoreDtoCopyWith on SignUpStoreDto {
  /// Returns a callable class used to build a new instance with modified fields.
  /// Example: `instanceOfSignUpStoreDto.copyWith(...)` or `instanceOfSignUpStoreDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SignUpStoreDtoCWProxy get copyWith => _$SignUpStoreDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpStoreDto _$SignUpStoreDtoFromJson(Map<String, dynamic> json) =>
    SignUpStoreDto(
      name: json['name'] as String,
      address: json['address'] as String,
      createdId: json['createdId'] as String,
    );

Map<String, dynamic> _$SignUpStoreDtoToJson(SignUpStoreDto instance) =>
    <String, dynamic>{
      'name': instance.name,
      'address': instance.address,
      'createdId': instance.createdId,
    };
