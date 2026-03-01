import 'package:json_annotation/json_annotation.dart';

part 'global_response.g.dart';

@JsonSerializable(genericArgumentFactories: true)
class GlobalResponse<T> {
  final int status;
  final String? message;
  final T? data;

  GlobalResponse({
    required this.status,
    required this.message,
    required this.data,
  });

  factory GlobalResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) => _$GlobalResponseFromJson(json, fromJsonT);
  Map<String, dynamic> toJson(Object Function(T value) toJsonT) =>
      _$GlobalResponseToJson(this, toJsonT);
}
