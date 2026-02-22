import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_model.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpModel {
  final String email;
  final String name;
  final String password;
  final String passwordConfirm;

  SignUpModel({
    required this.email,
    required this.name,
    required this.password,
    required this.passwordConfirm,
  });

  factory SignUpModel.fromJson(Map<String, dynamic> json) =>
      _$SignUpModelFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpModelToJson(this);
}
