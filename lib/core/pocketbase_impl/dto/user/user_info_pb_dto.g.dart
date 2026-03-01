// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_info_pb_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserInfoPBDTO _$UserInfoPBDTOFromJson(Map<String, dynamic> json) =>
    UserInfoPBDTO(
      token: json['token'] as String,
      record: UserInfoRecordPBDTO.fromJson(
        json['record'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$UserInfoPBDTOToJson(UserInfoPBDTO instance) =>
    <String, dynamic>{'token': instance.token, 'record': instance.record};
