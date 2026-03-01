// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_info_record_pb_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserInfoRecordPBDTO _$UserInfoRecordPBDTOFromJson(Map<String, dynamic> json) =>
    UserInfoRecordPBDTO(
      collectionId: json['collectionId'] as String,
      collectionName: json['collectionName'] as String,
      id: json['id'] as String,
      email: json['email'] as String,
      emailVisibility: json['emailVisibility'] as bool,
      verified: json['verified'] as bool,
      name: json['name'] as String,
      avatar: json['avatar'] as String,
      role: json['role'] as String,
      created: json['created'] as String,
      updated: json['updated'] as String,
    );

Map<String, dynamic> _$UserInfoRecordPBDTOToJson(
  UserInfoRecordPBDTO instance,
) => <String, dynamic>{
  'collectionId': instance.collectionId,
  'collectionName': instance.collectionName,
  'id': instance.id,
  'email': instance.email,
  'emailVisibility': instance.emailVisibility,
  'verified': instance.verified,
  'name': instance.name,
  'avatar': instance.avatar,
  'role': instance.role,
  'created': instance.created,
  'updated': instance.updated,
};
