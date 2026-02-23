import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/route/mobile_route.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  Widget _buildUsernameField() {
    return TextFormField(
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signInEmail.tr(),
        border: OutlineInputBorder(),
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signInPassword.tr(),
        border: OutlineInputBorder(),
      ),
    );
  }

  Widget _buildSignInButton() {
    return ElevatedButton(
      onPressed: () {},
      child: Text(LocaleKeyConst.signInBtnSignIn.tr()),
    );
  }

  Widget _buildSignUpButton() {
    return TextButton.icon(
      onPressed: () {
        context.goNamed(MobileRouteBuilder.signUp().name);
      },
      icon: Icon(Icons.person_add),
      label: Text(LocaleKeyConst.signUpBtnSignUp.tr()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DimensionConst.wh16),
          child: Form(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildUsernameField(),
                SizedBox(height: DimensionConst.wh16),
                _buildPasswordField(),
                SizedBox(height: DimensionConst.wh16),
                _buildSignInButton(),
                SizedBox(height: DimensionConst.wh16),
                _buildSignUpButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
