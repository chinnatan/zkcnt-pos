import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_user_entity.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpUserEntity {
  final String email;
  final String name;
  final String password;
  final String passwordConfirm;

  SignUpUserEntity({
    required this.email,
    required this.name,
    required this.password,
    required this.passwordConfirm,
  });

  factory SignUpUserEntity.fromJson(Map<String, dynamic> json) =>
      _$SignUpUserEntityFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpUserEntityToJson(this);
}
