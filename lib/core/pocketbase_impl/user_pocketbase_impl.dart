import 'package:pocketbase_drift/pocketbase_drift.dart';
import 'package:zkcnt_pos_app/core/constant/local_db_const.dart';
import 'package:zkcnt_pos_app/core/exception/http_exception.dart';
import 'package:zkcnt_pos_app/core/pocketbase/user_pocketbase.dart';
import 'package:zkcnt_pos_app/core/pocketbase_impl/dto/user/user_info_pb_dto.dart';
import 'package:zkcnt_pos_app/core/pocketbase_impl/dto/user/user_info_record_pb_dto.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

class UserPocketbaseImpl implements UserPocketbase {
  @override
  Future<UserInfoPBDTO> signIn(String email, String password) async {
    try {
      final user = await PocketBaseHelper.instance.pb
          .collection(LocalDBConst.users)
          .authWithPassword(email, password);

      return UserInfoPBDTO(
        token: user.token,
        record: UserInfoRecordPBDTO(
          collectionId: user.record.id,
          collectionName: LocalDBConst.users,
          id: user.record.id,
          email: user.record.getStringValue(LocalDBConst.email),
          emailVisibility: user.record.getBoolValue(
            LocalDBConst.emailVisibility,
          ),
          verified: user.record.getBoolValue(LocalDBConst.verified),
          name: user.record.getStringValue(LocalDBConst.name),
          avatar: user.record.getStringValue(LocalDBConst.avatar),
          role: user.record.getStringValue(LocalDBConst.role),
          created: user.record.getStringValue(LocalDBConst.created),
          updated: user.record.getStringValue(LocalDBConst.updated),
        ),
      );
    } on ClientException catch (e) {
      throw HTTPException(e.statusCode, e.response['message']);
    }
  }
}
