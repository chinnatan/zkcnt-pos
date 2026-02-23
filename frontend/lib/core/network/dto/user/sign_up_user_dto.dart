import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_user_dto.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpUserDto {
  final String email;
  final String name;
  final String password;
  final String passwordConfirm;

  /// role 'admin' for first register user
  final String role;

  SignUpUserDto({
    required this.email,
    required this.name,
    required this.password,
    required this.passwordConfirm,
    this.role = 'admin',
  });

  factory SignUpUserDto.fromJson(Map<String, dynamic> json) =>
      _$SignUpUserDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpUserDtoToJson(this);
}
