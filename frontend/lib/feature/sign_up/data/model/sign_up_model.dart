import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_store_model.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_user_model.dart';

part 'sign_up_model.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpModel {
  final SignUpUserModel user;
  final SignUpStoreModel store;

  SignUpModel({required this.user, required this.store});

  factory SignUpModel.fromJson(Map<String, dynamic> json) =>
      _$SignUpModelFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpModelToJson(this);
}
