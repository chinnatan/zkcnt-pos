import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_store_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_user_dto.dart';
import 'package:zkcnt_pos_app/core/network/impl/user_service_impl.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_model.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/user_model.dart';

class UserRemoteDatasource {
  final service = UserServiceImpl();

  Future<UserModel> signUp(SignUpModel payload) async {
    try {
      final response = await service.signUp(
        SignUpDto(
          user: SignUpUserDto(
            email: payload.user.email,
            name: payload.user.name,
            password: payload.user.password,
            passwordConfirm: payload.user.passwordConfirm,
          ),
          store: SignUpStoreDto(
            name: payload.store.name,
            address: payload.store.address,
            createdId: payload.store.createdId,
          ),
        ),
      );

      return UserModel(
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
