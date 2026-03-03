import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/dto/user/user_info_dto.dart';
import 'package:zkcnt_pos_app/feature/main/ui/bloc/side_menu_bloc.dart';
import 'package:zkcnt_pos_app/helper/app_helper.dart';

class SideMenuWidget extends StatefulWidget {
  const SideMenuWidget({super.key});

  @override
  State<SideMenuWidget> createState() => _SideMenuWidgetState();
}

class _SideMenuWidgetState extends State<SideMenuWidget> {
  final ScrollController scrollController = ScrollController();

  /// Variable
  late UserInfoDTO? userInfo;

  @override
  void initState() {
    userInfo = AppHelper.getUserInfo();
    super.initState();
  }

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }

  Widget _buildTitle() {
    return Padding(
      padding: EdgeInsets.only(
        top: DimensionConst.wh16,
        bottom: DimensionConst.wh16,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              LocaleKeyConst.appName.tr(),
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSideMenuItems() {
    return Column(
      children: [
        SideMenuItem(
          title: LocaleKeyConst.sideMenuHome.tr(),
          onTap: () {},
          icon: Icons.home,
        ),
        if (AppHelper.isAdmin()) _buildMenuForAdmin(),
      ],
    );
  }

  Widget _buildMenuForAdmin() {
    return Column(
      children: [
        SideMenuItem(
          title: LocaleKeyConst.sideMenuPos.tr(),
          onTap: () {},
          icon: Icons.shopping_cart,
        ),
        SideMenuItem(
          title: LocaleKeyConst.sideMenuProducts.tr(),
          onTap: () {},
          icon: Icons.inventory,
        ),
        SideMenuItem(
          title: LocaleKeyConst.sideMenuOrders.tr(),
          onTap: () {},
          icon: Icons.shopping_cart,
        ),
        SideMenuItem(
          title: LocaleKeyConst.sideMenuEmployees.tr(),
          onTap: () {},
          icon: Icons.person,
        ),
      ],
    );
  }

  Widget _buildLogoutButton() {
    return OutlinedButton(
      onPressed: () {
        context.read<SideMenuBloc>().add(SideMenuLogoutEvent());
      },
      child: Text(LocaleKeyConst.sideMenuLogout.tr()),
    );
  }

  Widget _buildUserInfo() {
    return Card.outlined(
      margin: EdgeInsets.only(bottom: DimensionConst.wh16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DimensionConst.wh16),
        side: BorderSide(color: Theme.of(context).colorScheme.outline),
      ),
      child: Padding(
        padding: EdgeInsets.all(DimensionConst.wh16),
        child: Column(
          children: [
            Row(
              children: [
                Text(
                  userInfo?.role ?? '',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Text(
                  userInfo?.name ?? '',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Row(children: [Expanded(child: _buildUserInfo())]),
        Row(children: [Expanded(child: _buildLogoutButton())]),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Padding(
        padding: const EdgeInsets.all(DimensionConst.wh16),
        child: Column(
          children: [
            Row(children: [Expanded(child: _buildTitle())]),
            Divider(),
            Expanded(child: _buildSideMenuItems()),
            Row(children: [Expanded(child: _buildFooter())]),
          ],
        ),
      ),
    );
  }
}

class SideMenuItem extends StatelessWidget {
  const SideMenuItem({
    super.key,
    required this.title,
    required this.onTap,
    required this.icon,
  });

  final String title;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(title),
      onTap: onTap,
      leading: Icon(icon),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DimensionConst.wh16),
      ),
    );
  }
}
