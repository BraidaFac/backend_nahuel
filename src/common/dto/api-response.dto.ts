export class ApiResponseDto<T = any> {
  success: boolean;
  message?: string;
  data?: T;

  constructor(success: boolean, data?: T, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
  }

  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, message);
  }

  static error(message: string): ApiResponseDto {
    return new ApiResponseDto(false, undefined, message);
  }
}
