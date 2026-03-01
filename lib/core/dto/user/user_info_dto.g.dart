// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_info_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserInfoDTO _$UserInfoDTOFromJson(Map<String, dynamic> json) => UserInfoDTO(
  token: json['token'] as String,
  id: json['id'] as String,
  email: json['email'] as String,
  emailVisibility: json['emailVisibility'] as bool,
  verified: json['verified'] as bool,
  name: json['name'] as String,
  avatar: json['avatar'] as String,
  role: json['role'] as String,
);

Map<String, dynamic> _$UserInfoDTOToJson(UserInfoDTO instance) =>
    <String, dynamic>{
      'token': instance.token,
      'id': instance.id,
      'email': instance.email,
      'emailVisibility': instance.emailVisibility,
      'verified': instance.verified,
      'name': instance.name,
      'avatar': instance.avatar,
      'role': instance.role,
    };
