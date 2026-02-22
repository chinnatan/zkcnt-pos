import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_dto.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpDto {
  final String email;
  final String name;
  final String password;
  final String passwordConfirm;

  SignUpDto({
    required this.email,
    required this.name,
    required this.password,
    required this.passwordConfirm,
  });

  factory SignUpDto.fromJson(Map<String, dynamic> json) =>
      _$SignUpDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpDtoToJson(this);
}
