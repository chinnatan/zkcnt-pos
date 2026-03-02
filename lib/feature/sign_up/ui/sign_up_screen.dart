import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:loader_overlay/loader_overlay.dart';
import 'package:responsiveness/responsiveness.dart';
import 'package:zkcnt_pos_app/core/constant/dimension_const.dart';
import 'package:zkcnt_pos_app/core/constant/locale_key_const.dart';
import 'package:zkcnt_pos_app/core/route/mobile_route.dart';
import 'package:zkcnt_pos_app/feature/sign_up/domain/entity/sign_up_entity.dart';
import 'package:zkcnt_pos_app/feature/sign_up/ui/bloc/sign_up_bloc.dart';
import 'package:zkcnt_pos_app/helper/notify_helper.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  /// Form Key
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  /// Text Editing Controllers
  final TextEditingController nameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();
  final TextEditingController storeNameController = TextEditingController();
  final TextEditingController storeAddressController = TextEditingController();

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    storeNameController.dispose();
    storeAddressController.dispose();
    super.dispose();
  }

  Widget _buildTitle() {
    return Row(
      children: [
        IconButton(
          onPressed: () {
            context.goNamed(MobileRouteBuilder.signIn().name);
          },
          icon: Icon(Icons.arrow_back),
        ),
        Expanded(
          child: Text(
            LocaleKeyConst.signUpTitle.tr(),
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
      ],
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: emailController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signInEmail.tr(),
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.email),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpEmailRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildNameField() {
    return TextFormField(
      controller: nameController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signUpName.tr(),
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.person),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpNameRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildPasswordField() {
    return BlocBuilder<SignUpBloc, SignUpState>(
      builder: (context, state) {
        final isPasswordVisible = state is SignUpPasswordVisible
            ? (state).isVisible
            : false;

        return TextFormField(
          controller: passwordController,
          obscureText: !isPasswordVisible,
          decoration: InputDecoration(
            labelText: LocaleKeyConst.signUpPassword.tr(),
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock),
            suffixIcon: IconButton(
              onPressed: () {
                context.read<SignUpBloc>().add(
                  SignUpPasswordVisibleEvent(isVisible: !isPasswordVisible),
                );
              },
              icon: Icon(
                isPasswordVisible ? Icons.visibility : Icons.visibility_off,
              ),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return LocaleKeyConst.signUpPasswordRequired.tr();
            }
            return null;
          },
        );
      },
    );
  }

  Widget _buildConfirmPasswordField() {
    return BlocBuilder<SignUpBloc, SignUpState>(
      builder: (context, state) {
        final isPasswordConfirmVisible = state is SignUpPasswordConfirmVisible
            ? (state).isVisible
            : false;

        return TextFormField(
          controller: confirmPasswordController,
          obscureText: !isPasswordConfirmVisible,
          decoration: InputDecoration(
            labelText: LocaleKeyConst.signUpConfirmPassword.tr(),
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock),
            suffixIcon: IconButton(
              onPressed: () {
                context.read<SignUpBloc>().add(
                  SignUpPasswordConfirmVisibleEvent(
                    isVisible: !isPasswordConfirmVisible,
                  ),
                );
              },
              icon: Icon(
                isPasswordConfirmVisible
                    ? Icons.visibility
                    : Icons.visibility_off,
              ),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return LocaleKeyConst.signUpConfirmPasswordRequired.tr();
            }
            return null;
          },
        );
      },
    );
  }

  Widget _buildStoreNameField() {
    return TextFormField(
      controller: storeNameController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signUpStoreName.tr(),
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.store),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpStoreNameRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildStoreAddressField() {
    return TextFormField(
      controller: storeAddressController,
      decoration: InputDecoration(
        labelText: LocaleKeyConst.signUpStoreAddress.tr(),
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.location_on),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return LocaleKeyConst.signUpStoreAddressRequired.tr();
        }
        return null;
      },
    );
  }

  Widget _buildSignUpButton() {
    return FilledButton(
      onPressed: () async {
        if (formKey.currentState?.validate() ?? false) {}

        final payload = SignUpEntity(
          name: nameController.text,
          email: emailController.text,
          password: passwordController.text,
          passwordConfirm: confirmPasswordController.text,
          storeName: storeNameController.text,
          storeAddress: storeAddressController.text,
        );

        context.read<SignUpBloc>().add(
          SignUpSubmitEvent(signUpEntity: payload),
        );
      },
      child: Text(LocaleKeyConst.signUpBtnSignUp.tr()),
    );
  }

  Widget _buildGeneralForm() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildTitle(),
        SizedBox(height: DimensionConst.wh16),
        _buildNameField(),
        SizedBox(height: DimensionConst.wh16),
        _buildEmailField(),
        SizedBox(height: DimensionConst.wh16),
        _buildPasswordField(),
        SizedBox(height: DimensionConst.wh16),
        _buildConfirmPasswordField(),
      ],
    );
  }

  Widget _buildStoreInfo() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                LocaleKeyConst.signUpStoreInfo.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
        SizedBox(height: DimensionConst.wh16),
        _buildStoreNameField(),
        SizedBox(height: DimensionConst.wh16),
        _buildStoreAddressField(),
      ],
    );
  }

  Widget _buildChildContainer() {
    return Expanded(
      flex: DimensionConst.flex2,
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
                  _buildGeneralForm(),
                  SizedBox(height: DimensionConst.wh16),
                  _buildStoreInfo(),
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

  Widget _buildMobileContainer() {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [_buildChildContainer()],
      ),
    );
  }

  Widget _buildDefaultContainer() {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(flex: DimensionConst.flex1, child: Container()),
          _buildChildContainer(),
          Flexible(flex: DimensionConst.flex1, child: Container()),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocListener<SignUpBloc, SignUpState>(
          listener: (context, state) {
            try {
              if (state is SignUpLoading) {
                context.loaderOverlay.show();
              } else if (state is SignUpSuccess) {
                NotifyHelper.instance.showSuccess(
                  context,
                  LocaleKeyConst.signUpSignUpSuccess.tr(),
                );
                context.goNamed(MobileRouteBuilder.signIn().name);
              } else if (state is SignUpFailure) {
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
                        child: Row(
                          children: [
                            ResponsiveChild(
                              xs: _buildMobileContainer(),
                              md: _buildDefaultContainer(),
                              lg: _buildDefaultContainer(),
                              xl: _buildDefaultContainer(),
                              xxl: _buildDefaultContainer(),
                            ),
                          ],
                        ),
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
