import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/pocketbase/user_pocketbase.dart';

class UserPocketbaseRemoteDatasource {
  final UserPocketbase userPocketbase;

  UserPocketbaseRemoteDatasource({required this.userPocketbase});

  Future<UserInfoDTO> signIn(String email, String password) async {
    try {
      final userInfo = await userPocketbase.signIn(email, password);
      return UserInfoDTO(
        token: userInfo.token,
        id: userInfo.record.id,
        email: userInfo.record.email,
        emailVisibility: userInfo.record.emailVisibility,
        verified: userInfo.record.verified,
        name: userInfo.record.name,
        avatar: userInfo.record.avatar,
        role: userInfo.record.role,
      );
    } on HTTPException {
      rethrow;
    }
  }
}
