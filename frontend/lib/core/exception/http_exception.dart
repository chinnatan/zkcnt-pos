import 'dart:io';

class HTTPException<T> implements Exception {
  int? status = HttpStatus.internalServerError;
  final String message;
  final T? data;

  HTTPException(this.status, this.message, {this.data});

  @override
  String toString() {
    return message;
  }
}
