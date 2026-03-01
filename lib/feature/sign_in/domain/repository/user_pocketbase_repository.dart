import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';

abstract class UserPocketbaseRepository {
  Future<UserInfoDTO> signIn(String email, String password);
}
