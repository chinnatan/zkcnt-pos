import 'package:zkcnt_pos_app/core/pocketbase_impl/dto/user/user_info_pb_dto.dart';

abstract class UserPocketbase {
  Future<UserInfoPBDTO> signIn(String email, String password);
}
