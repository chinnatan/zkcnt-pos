import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_user_model.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpUserModel {
  final String email;
  final String name;
  final String password;
  final String passwordConfirm;

  SignUpUserModel({
    required this.email,
    required this.name,
    required this.password,
    required this.passwordConfirm,
  });

  factory SignUpUserModel.fromJson(Map<String, dynamic> json) =>
      _$SignUpUserModelFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpUserModelToJson(this);
}
