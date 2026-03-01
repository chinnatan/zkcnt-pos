import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/core/route/mobile_route.dart';
import 'package:zkcnt_pos_app/helper/pocket_base_helper.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Text('Main Screen'),
            TextButton(
              onPressed: () {
                PocketBaseHelper.instance.pb.authStore.clear();
                context.goNamed(MobileRouteBuilder.signIn().name);
              },
              child: Text('Sign Out'),
            ),
          ],
        ),
      ),
    );
  }
}
