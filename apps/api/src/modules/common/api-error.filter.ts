import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

function fallbackCode(status: number) {
  if (status === HttpStatus.UNAUTHORIZED) return "AUTH_INVALID_TOKEN";
  if (status === HttpStatus.FORBIDDEN) return "AUTH_FORBIDDEN";
  if (status === HttpStatus.NOT_FOUND) return "COMMON_NOT_FOUND";
  return "COMMON_BAD_REQUEST";
}

@Catch(HttpException)
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === "object" && body !== null && "code" in body) {
      response.status(status).json({
        statusCode: status,
        path: request.url,
        timestamp: new Date().toISOString(),
        ...body,
      });
      return;
    }

    const message =
      typeof body === "string"
        ? body
        : typeof body === "object" && body !== null && "message" in body
          ? Array.isArray((body as { message: unknown }).message)
            ? (body as { message: string[] }).message.join(", ")
            : String((body as { message: unknown }).message)
          : exception.message;

    response.status(status).json({
      statusCode: status,
      code: fallbackCode(status),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
