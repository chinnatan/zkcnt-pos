import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:responsiveness/responsiveness.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/route/route.dart';
import 'package:zkcnt_pos_app/feature/sign_in/ui/bloc/sign_in_bloc.dart';
import 'package:zkcnt_pos_app/helper/notify_helper.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  /// Form Key
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  /// Text Editing Controllers
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
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
          return LocaleKeyConst.signInEmailRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: passwordController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signInPassword.tr(),
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signInPasswordRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildSignInButton() {
    return FilledButton(
      onPressed: () {
        if (formKey.currentState?.validate() ?? false) {
          context.read<SignInBloc>().add(
            SignInSubmitEvent(
              email: emailController.text,
              password: passwordController.text,
            ),
          );
        }
      },
      child: Text(LocaleKeyConst.signInBtnSignIn.tr()),
    );
  }

  Widget _buildSignUpButton() {
    return TextButton.icon(
      onPressed: () {
        context.goNamed(DefaultRouteBuilder.signUp().name);
      },
      icon: Icon(Icons.person_add),
      label: Text(LocaleKeyConst.signUpBtnSignUp.tr()),
    );
  }

  Widget _buildDefaultContainer() {
    return Expanded(
      child: Column(
        children: [
          Card.outlined(
            shape: RoundedRectangleBorder(
              side: BorderSide(color: Theme.of(context).colorScheme.outline),
              borderRadius: BorderRadius.circular(DimensionConst.wh16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(DimensionConst.wh16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildEmailField(),
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
        ],
      ),
    );
  }

  Widget _buildWebContainer() {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(flex: DimensionConst.flex1, child: Container()),
          _buildDefaultContainer(),
          Flexible(flex: DimensionConst.flex1, child: Container()),
        ],
      ),
    );
  }

  Widget _buildMobileContainer() {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [_buildDefaultContainer()],
      ),
    );
  }

  Widget _buildResponsiveContainer() {
    return ResponsiveChild(
      xs: _buildMobileContainer(),
      md: _buildWebContainer(),
      lg: _buildWebContainer(),
      xl: _buildWebContainer(),
      xxl: _buildWebContainer(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocListener<SignInBloc, SignInState>(
          listener: (context, state) {
            try {
              if (state is SignInLoading) {
                context.loaderOverlay.show();
              } else if (state is SignInSuccess) {
                NotifyHelper.instance.showSuccess(
                  context,
                  LocaleKeyConst.signInSuccess.tr(),
                );
                context.goNamed(DefaultRouteBuilder.home().name);
              } else if (state is SignInFailure) {
                NotifyHelper.instance.showError(context, state.message);
              }
            } finally {
              context.loaderOverlay.hide();
            }
          },
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
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Row(children: [_buildResponsiveContainer()]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
