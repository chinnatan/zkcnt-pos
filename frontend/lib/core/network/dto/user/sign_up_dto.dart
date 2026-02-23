import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_store_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_user_dto.dart';

part 'sign_up_dto.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpDto {
  final SignUpUserDto user;
  final SignUpStoreDto store;

  SignUpDto({required this.user, required this.store});

  factory SignUpDto.fromJson(Map<String, dynamic> json) =>
      _$SignUpDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpDtoToJson(this);
}
