import 'package:dio/dio.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/network/dio/dio_client.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/sign_up_model.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/model/user_model.dart';

class UserRemoteDatasource {
  final service = DioClient().userService;

  Future<UserModel> signUp(SignUpModel payload) async {
    try {
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

      return UserModel(
        id: response.data?.id ?? '',
        email: response.data?.email ?? '',
        name: response.data?.name ?? '',
        role: response.data?.role ?? '',
        storeId: response.data?.storeId ?? '',
        storeName: response.data?.storeName ?? '',
        storeAddress: response.data?.storeAddress ?? '',
      );
    } on DioException catch (e) {
      throw HTTPException(
        e.response?.statusCode ?? 500,
        e.response?.data['message'] ?? 'An unknown error occurred',
      );
    }
  }
}
