import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/user_dto.dart';

abstract class UserService {
  Future<UserDto> signUp(SignUpDto payload);
}
