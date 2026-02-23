import 'package:pocketbase/pocketbase.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/core/constant/network_const.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/sign_up_store_dto.dart';
import 'package:zkcnt_pos_app/core/network/dto/user/user_dto.dart';
import 'package:zkcnt_pos_app/core/network/user_service.dart';
import 'package:zkcnt_pos_app/helper/log_helper.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

class UserServiceImpl implements UserService {
  final pb = PocketBaseHelper.instance.pb;
  @override
  Future<UserDto> signUp(SignUpDto payload) async {
    try {
      /// สร้าง user ใหม่
      final createdUser = await pb
          .collection(LocalDBConst.users)
          .create(body: payload.user.toJson());

      /// ตั้งค่า createdId ของ store
      payload.store.createdId = createdUser.id;

      final store = payload.store.copyWith(createdId: createdUser.id);

      /// สร้าง store ใหม่
      final _ = await pb
          .collection(LocalDBConst.stores)
          .create(body: store.toJson());

      return UserDto(
        collectionId: createdUser.collectionId,
        collectionName: createdUser.collectionName,
        id: createdUser.id,
        email: createdUser.get(NetworkConst.email),
        emailVisibility: createdUser.get(NetworkConst.emailVisibility),
        verified: createdUser.get(NetworkConst.verified),
        name: createdUser.get(NetworkConst.name),
        avatar: createdUser.get(NetworkConst.avatar),
        created: createdUser.get(NetworkConst.created),
        updated: createdUser.get(NetworkConst.updated),
      );
    } on ClientException catch (e) {
      LogHelper.e(
        e.response[NetworkConst.message],
        error: e,
        stackTrace: StackTrace.current,
      );
      throw HTTPException(
        e.response[NetworkConst.status],
        e.response[NetworkConst.message],
        data: e.response[NetworkConst.data],
      );
    }
  }
}
