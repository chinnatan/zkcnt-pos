import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/global_response.dart';

part 'user_service.g.dart';

@RestApi()
abstract class UserService {
  factory UserService(Dio dio, {required String baseUrl}) = _UserService;

  @POST("/api/v1/auth/signup")
  Future<GlobalResponse<dynamic>> signUp(SignUpDto payload);
}
