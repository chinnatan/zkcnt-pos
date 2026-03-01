import 'package:json_annotation/json_annotation.dart';

part 'user_info_record_pb_dto.g.dart';

@JsonSerializable()
class UserInfoRecordPBDTO {
  final String collectionId;
  final String collectionName;
  final String id;
  final String email;
  final bool emailVisibility;
  final bool verified;
  final String name;
  final String avatar;
  final String role;
  final String created;
  final String updated;

  UserInfoRecordPBDTO({
    required this.collectionId,
    required this.collectionName,
    required this.id,
    required this.email,
    required this.emailVisibility,
    required this.verified,
    required this.name,
    required this.avatar,
    required this.role,
    required this.created,
    required this.updated,
  });

  factory UserInfoRecordPBDTO.fromJson(Map<String, dynamic> json) =>
      _$UserInfoRecordPBDTOFromJson(json);

  Map<String, dynamic> toJson() => _$UserInfoRecordPBDTOToJson(this);
}
