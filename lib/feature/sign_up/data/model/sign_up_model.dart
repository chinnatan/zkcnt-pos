import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_model.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpModel {
  final String name;
  final String email;
  final String password;
  final String passwordConfirm;
  final String storeName;
  final String storeAddress;

  SignUpModel({
    required this.name,
    required this.email,
    required this.password,
    required this.passwordConfirm,
    required this.storeName,
    required this.storeAddress,
  });

  factory SignUpModel.fromJson(Map<String, dynamic> json) =>
      _$SignUpModelFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpModelToJson(this);
}
