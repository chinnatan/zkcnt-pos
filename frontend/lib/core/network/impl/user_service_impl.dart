import 'package:pocketbase/pocketbase.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/user_dto.dart';
import 'package:zkcnt_pos_app/core/network/user_service.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

class UserServiceImpl implements UserService {
  final pb = PocketBaseHelper.instance.pb;
  @override
  Future<UserDto> signUp(SignUpDto payload) async {
    try {
      final response = await pb
          .collection('users')
          .create(body: payload.toJson());

      return UserDto(
        collectionId: response.collectionId,
        collectionName: response.collectionName,
        id: response.id,
        email: response.get('email'),
        emailVisibility: response.get('emailVisibility'),
        verified: response.get('verified'),
        name: response.get('name'),
        avatar: response.get('avatar'),
        created: response.get('created'),
        updated: response.get('updated'),
      );
    } on ClientException catch (e) {
      LogHelper.e(
        e.response['message'],
        error: e,
        stackTrace: StackTrace.current,
      );
      throw HTTPException(
        e.response['status'],
        e.response['message'],
        data: e.response['data'],
      );
    }
  }
}
