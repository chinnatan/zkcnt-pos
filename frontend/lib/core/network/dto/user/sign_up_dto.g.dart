// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SignUpDtoCWProxy {
  SignUpDto user(SignUpUserDto user);

  SignUpDto store(SignUpStoreDto store);

  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpDto call({SignUpUserDto user, SignUpStoreDto store});
}

/// Callable proxy for `copyWith` functionality.
/// Use as `instanceOfSignUpDto.copyWith(...)` or call `instanceOfSignUpDto.copyWith.fieldName(value)` for a single field.
class _$SignUpDtoCWProxyImpl implements _$SignUpDtoCWProxy {
  const _$SignUpDtoCWProxyImpl(this._value);

  final SignUpDto _value;

  @override
  SignUpDto user(SignUpUserDto user) => call(user: user);

  @override
  SignUpDto store(SignUpStoreDto store) => call(store: store);

  @override
  /// Creates a new instance with the provided field values.
  /// Passing `null` to a nullable field nullifies it, while `null` for a non-nullable field is ignored. To update a single field use `SignUpDto(...).copyWith.fieldName(value)`.
  ///
  /// Example:
  /// ```dart
  /// SignUpDto(...).copyWith(id: 12, name: "My name")
  /// ```
  SignUpDto call({
    Object? user = const $CopyWithPlaceholder(),
    Object? store = const $CopyWithPlaceholder(),
  }) {
    return SignUpDto(
      user: user == const $CopyWithPlaceholder() || user == null
          ? _value.user
          // ignore: cast_nullable_to_non_nullable
          : user as SignUpUserDto,
      store: store == const $CopyWithPlaceholder() || store == null
          ? _value.store
          // ignore: cast_nullable_to_non_nullable
          : store as SignUpStoreDto,
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
  user: SignUpUserDto.fromJson(json['user'] as Map<String, dynamic>),
  store: SignUpStoreDto.fromJson(json['store'] as Map<String, dynamic>),
);

Map<String, dynamic> _$SignUpDtoToJson(SignUpDto instance) => <String, dynamic>{
  'user': instance.user,
  'store': instance.store,
};
