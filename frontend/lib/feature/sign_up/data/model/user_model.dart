import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel {
  final String id;
  final String email;
  final bool emailVisibility;
  final bool verified;
  final String name;
  final String avatar;
  final String created;
  final String updated;

  UserModel({
    required this.id,
    required this.email,
    required this.emailVisibility,
    required this.verified,
    required this.name,
    required this.avatar,
    required this.created,
    required this.updated,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);
}
