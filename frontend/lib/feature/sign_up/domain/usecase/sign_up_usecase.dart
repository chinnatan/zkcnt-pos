import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/user_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/repository/user_repository.dart';

class SignUpUsecase {
  final UserRepository userRepository;

  SignUpUsecase({required this.userRepository});

  Future<UserEntity> call(SignUpEntity payload) async {
    return userRepository.signUp(payload);
  }
}
