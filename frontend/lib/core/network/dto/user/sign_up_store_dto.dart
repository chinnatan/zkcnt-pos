import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_store_dto.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpStoreDto {
  final String name;
  final String address;
  String createdId;

  SignUpStoreDto({
    required this.name,
    required this.address,
    required this.createdId,
  });

  factory SignUpStoreDto.fromJson(Map<String, dynamic> json) =>
      _$SignUpStoreDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpStoreDtoToJson(this);
}
