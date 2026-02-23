import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_store_model.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpStoreModel {
  final String name;
  final String address;
  String createdId;

  SignUpStoreModel({
    required this.name,
    required this.address,
    required this.createdId,
  });

  factory SignUpStoreModel.fromJson(Map<String, dynamic> json) =>
      _$SignUpStoreModelFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpStoreModelToJson(this);
}
