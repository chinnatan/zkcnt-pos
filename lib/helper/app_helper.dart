import 'package:zkcnt_pos_app/core/constant/local_storage_key_const.dart';
import 'package:zkcnt_pos_app/core/constant/user_const.dart';
import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';
import 'package:zkcnt_pos_app/helper/local_storage_helper.dart';

class AppHelper {
  static UserInfoDTO? getUserInfo() {
    final strUserInfo = LocalStorageHelper.instance.getString(
      LocalStorageKeyConst.userInfo,
    );
    if (strUserInfo == null) {
      return null;
    }
    return UserInfoDTO.fromJson(strUserInfo);
  }

  static bool isAdmin() {
    return UserConst.roleAdmin == getUserInfo()?.role;
  }

  static bool isCashier() {
    return UserConst.roleCashier == getUserInfo()?.role;
  }
}
