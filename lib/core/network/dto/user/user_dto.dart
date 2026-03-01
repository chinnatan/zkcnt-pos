import 'package:json_annotation/json_annotation.dart';

part 'user_dto.g.dart';

@JsonSerializable()
class UserDto {
  final String id;
  final String email;
  final String name;
  final String role;
  final String storeId;
  final String storeName;
  final String storeAddress;

  UserDto({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.storeId,
    required this.storeName,
    required this.storeAddress,
  });

  factory UserDto.fromJson(Map<String, dynamic> json) =>
      _$UserDtoFromJson(json);

  Map<String, dynamic> toJson() => _$UserDtoToJson(this);
}
