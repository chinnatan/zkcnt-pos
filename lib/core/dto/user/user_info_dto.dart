import 'package:json_annotation/json_annotation.dart';

part 'user_info_dto.g.dart';

@JsonSerializable()
class UserInfoDTO {
  final String token;
  final String id;
  final String email;
  final bool emailVisibility;
  final bool verified;
  final String name;
  final String avatar;
  final String role;

  UserInfoDTO({
    required this.token,
    required this.id,
    required this.email,
    required this.emailVisibility,
    required this.verified,
    required this.name,
    required this.avatar,
    required this.role,
  });

  factory UserInfoDTO.fromJson(Map<String, dynamic> json) =>
      _$UserInfoDTOFromJson(json);

  Map<String, dynamic> toJson() => _$UserInfoDTOToJson(this);
}
