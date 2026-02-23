import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_store_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_user_entity.dart';

part 'sign_up_entity.g.dart';

@CopyWith()
@JsonSerializable()
class SignUpEntity {
  final SignUpUserEntity user;
  final SignUpStoreEntity store;

  SignUpEntity({required this.user, required this.store});

  factory SignUpEntity.fromJson(Map<String, dynamic> json) =>
      _$SignUpEntityFromJson(json);

  Map<String, dynamic> toJson() => _$SignUpEntityToJson(this);
}
