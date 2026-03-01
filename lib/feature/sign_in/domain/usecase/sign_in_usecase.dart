import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';
import 'package:zkcnt_pos_app/feature/sign_in/domain/repository/user_pocketbase_repository.dart';

class SignInUsecase {
  final UserPocketbaseRepository userPocketbaseRepository;

  SignInUsecase({required this.userPocketbaseRepository});

  Future<UserInfoDTO> call(String email, String password) async {
    return userPocketbaseRepository.signIn(email, password);
  }
}
