import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/feature/sign_in/data/datasource/user_pocketbase_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_in/domain/repository/user_pocketbase_repository.dart';

class UserPocketbaseRepositoryImpl implements UserPocketbaseRepository {
  final UserPocketbaseRemoteDatasource datasource;

  UserPocketbaseRepositoryImpl({required this.datasource});

  @override
  Future<UserInfoDTO> signIn(String email, String password) async {
    try {
      final userInfo = await datasource.signIn(email, password);
      return userInfo;
    } on HTTPException {
      rethrow;
    }
  }
}
