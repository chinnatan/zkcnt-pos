import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/user_entity.dart';

abstract class UserRepository {
  Future<UserEntity> signUp(SignUpEntity payload);
}
