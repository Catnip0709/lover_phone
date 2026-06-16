import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { ApiErrorResponse } from "@myphone/shared";

type HttpRequestLike = {
  method: string;
  url: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => {
    json: (body: ApiErrorResponse) => void;
  };
};

type RequestBodyError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<HttpRequestLike>();
    const response = context.getResponse<HttpResponseLike>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : this.resolveNonHttpStatus(exception);
    const message = this.resolveMessage(exception);
    const errorCode = this.resolveErrorCode(exception, statusCode);
    const body: ApiErrorResponse = {
      errorCode,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${statusCode} ${errorCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (process.env.NODE_ENV !== "production") {
      this.logger.warn(`${request.method} ${request.url} ${statusCode} ${errorCode}: ${message}`);
    }

    response.status(statusCode).json(body);
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        return payload;
      }

      if (this.isErrorPayload(payload)) {
        return Array.isArray(payload.message) ? payload.message.join("; ") : payload.message;
      }
    }

    if (this.isRequestBodyError(exception) && (exception.status === 413 || exception.statusCode === 413)) {
      return "上传内容过大，请压缩头像图片后重试";
    }

    return process.env.NODE_ENV === "production" ? "服务暂时不可用" : "服务内部错误";
  }

  private resolveNonHttpStatus(exception: unknown): number {
    if (this.isRequestBodyError(exception) && (exception.status === 413 || exception.statusCode === 413)) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveErrorCode(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (this.isErrorPayload(payload) && typeof payload.errorCode === "string") {
        return payload.errorCode;
      }
    }

    const byStatus: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "AUTH_UNAUTHORIZED",
      403: "AUTH_FORBIDDEN",
      404: "RESOURCE_NOT_FOUND",
      409: "RESOURCE_CONFLICT",
      413: "PAYLOAD_TOO_LARGE",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
    };

    return byStatus[statusCode] ?? "REQUEST_FAILED";
  }

  private isErrorPayload(payload: unknown): payload is { message: string | string[]; errorCode?: string } {
    return typeof payload === "object" && payload !== null && "message" in payload;
  }

  private isRequestBodyError(exception: unknown): exception is RequestBodyError {
    return exception instanceof Error && "type" in exception;
  }
}
