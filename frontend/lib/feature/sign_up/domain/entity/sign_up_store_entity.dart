import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'sign_up_store_entity.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpStoreEntity {
  final String name;
  final String address;
  String createdId;

  SignUpStoreEntity({
    required this.name,
    required this.address,
    required this.createdId,
  });

  factory SignUpStoreEntity.fromJson(Map<String, dynamic> json) =>
      _$SignUpStoreEntityFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpStoreEntityToJson(this);
}
