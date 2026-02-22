// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sign_up_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignUpDto _$SignUpDtoFromJson(Map<String, dynamic> json) => SignUpDto(
  email: json['email'] as String,
  name: json['name'] as String,
  password: json['password'] as String,
  passwordConfirm: json['passwordConfirm'] as String,
);

Map<String, dynamic> _$SignUpDtoToJson(SignUpDto instance) => <String, dynamic>{
  'email': instance.email,
  'name': instance.name,
  'password': instance.password,
  'passwordConfirm': instance.passwordConfirm,
};
