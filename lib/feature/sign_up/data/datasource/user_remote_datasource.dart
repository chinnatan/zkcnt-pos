import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/network/dio/dio_client.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/user_dto.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_model.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/user_model.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';

class UserRemoteDatasource {
  final service = DioClient().userService;

  Future<UserModel> signUp(SignUpModel payload) async {
    try {
      LogHelper.i(payload.toJson().toString());
      final response = await service.signUp(
        SignUpDto(
          name: payload.name,
          email: payload.email,
          password: payload.password,
          passwordConfirm: payload.passwordConfirm,
          storeName: payload.storeName,
          storeAddress: payload.storeAddress,
        ),
      );

      final dto = UserDto.fromJson(response.data);

      return UserModel(
        id: dto.id,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        storeId: dto.storeId,
        storeName: dto.storeName,
        storeAddress: dto.storeAddress,
      );
    } on HTTPException {
      rethrow;
    }
  }
}
