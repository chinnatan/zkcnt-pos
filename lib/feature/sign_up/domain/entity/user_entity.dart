import 'package:json_annotation/json_annotation.dart';

part 'user_entity.g.dart';

@JsonSerializable()
class UserEntity {
  final String id;
  final String email;
  final String name;
  final String role;
  final String storeId;
  final String storeName;
  final String storeAddress;

  UserEntity({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.storeId,
    required this.storeName,
    required this.storeAddress,
  });

  factory UserEntity.fromJson(Map<String, dynamic> json) =>
      _$UserEntityFromJson(json);

  Map<String, dynamic> toJson() => _$UserEntityToJson(this);
}
