import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/datasource/user_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_model.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/user_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/repository/user_repository.dart';

class UserRepositoryImpl implements UserRepository {
  final UserRemoteDatasource datasource;

  UserRepositoryImpl({required this.datasource});

  @override
  Future<UserEntity> signUp(SignUpEntity payload) async {
    try {
      final response = await datasource.signUp(
        SignUpModel(
          email: payload.email,
          name: payload.name,
          password: payload.password,
          passwordConfirm: payload.passwordConfirm,
        ),
      );
      return UserEntity(
        id: response.id,
        email: response.email,
        emailVisibility: response.emailVisibility,
        verified: response.verified,
        name: response.name,
        avatar: response.avatar,
        created: response.created,
        updated: response.updated,
      );
    } on HTTPException {
      rethrow;
    }
  }
}
