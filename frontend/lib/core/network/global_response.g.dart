// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'global_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

GlobalResponse<T> _$GlobalResponseFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) => GlobalResponse<T>(
  status: (json['status'] as num).toInt(),
  message: json['message'] as String?,
  data: _$nullableGenericFromJson(json['data'], fromJsonT),
);

Map<String, dynamic> _$GlobalResponseToJson<T>(
  GlobalResponse<T> instance,
  Object? Function(T value) toJsonT,
) => <String, dynamic>{
  'status': instance.status,
  'message': instance.message,
  'data': _$nullableGenericToJson(instance.data, toJsonT),
};

T? _$nullableGenericFromJson<T>(
  Object? input,
  T Function(Object? json) fromJson,
) => input == null ? null : fromJson(input);

Object? _$nullableGenericToJson<T>(
  T? input,
  Object? Function(T value) toJson,
) => input == null ? null : toJson(input);
