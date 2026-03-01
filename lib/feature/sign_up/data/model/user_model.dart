import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel {
  final String id;
  final String email;
  final String name;
  final String role;
  final String storeId;
  final String storeName;
  final String storeAddress;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.storeId,
    required this.storeName,
    required this.storeAddress,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);
}
