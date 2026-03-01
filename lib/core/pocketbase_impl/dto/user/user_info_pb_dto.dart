import 'package:zkcnt_pos_app/core/pocketbase_impl/dto/user/user_info_record_pb_dto.dart';
import 'package:json_annotation/json_annotation.dart';

part 'user_info_pb_dto.g.dart';

@JsonSerializable()
class UserInfoPBDTO {
  final String token;
  final UserInfoRecordPBDTO record;

  UserInfoPBDTO({required this.token, required this.record});

  factory UserInfoPBDTO.fromJson(Map<String, dynamic> json) =>
      _$UserInfoPBDTOFromJson(json);

  Map<String, dynamic> toJson() => _$UserInfoPBDTOToJson(this);
}
