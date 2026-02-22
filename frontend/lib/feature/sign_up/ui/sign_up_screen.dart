import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/datasource/user_remote_datasource.dart';
import 'package:zkcnt_pos_app/feature/sign_up/data/repository/user_repository_impl.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/usecase/sign_up_usecase.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  /// Form Key
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  /// Text Editing Controllers
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Widget _buildTitle() {
    return Text(
      LocaleKeyConst.signUpTitle.tr(),
      style: Theme.of(context).textTheme.titleLarge,
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: emailController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signInEmail.tr(),
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpEmailRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: passwordController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signUpPassword.tr(),
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpPasswordRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildConfirmPasswordField() {
    return TextFormField(
      controller: confirmPasswordController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signUpConfirmPassword.tr(),
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpConfirmPasswordRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildSignUpButton() {
    return ElevatedButton(
      onPressed: () async {
        if (formKey.currentState?.validate() ?? false) {}

        SignUpUsecase usecase = SignUpUsecase(
          userRepository: UserRepositoryImpl(
            datasource: UserRemoteDatasource(),
          ),
        );

        final _ = await usecase(
          SignUpEntity(
            email: emailController.text,
            name: emailController.text,
            password: passwordController.text,
            passwordConfirm: confirmPasswordController.text,
          ),
        );

        setState(() {});
      },
      child: Text(LocaleKeyConst.signUpBtnSignUp.tr()),
    );
  }

  Widget _buildContainer() {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Spacer(),
          Flexible(
            flex: DimensionConst.flex1,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Card.filled(
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  elevation: DimensionConst.wh4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(DimensionConst.wh16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(DimensionConst.wh16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildTitle(),
                        SizedBox(height: DimensionConst.wh16),
                        _buildEmailField(),
                        SizedBox(height: DimensionConst.wh16),
                        _buildPasswordField(),
                        SizedBox(height: DimensionConst.wh16),
                        _buildConfirmPasswordField(),
                        SizedBox(height: DimensionConst.wh16),
                        _buildSignUpButton(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Spacer(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).unfocus();
          },
          child: Center(
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(DimensionConst.wh16),
                    child: Form(
                      key: formKey,
                      child: Row(children: [_buildContainer()]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
