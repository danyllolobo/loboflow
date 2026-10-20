import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorBody } from '@loboflow/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Ocorreu um erro interno no servidor';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj['message'] as string) || message;
        code = (obj['error'] as string) || (obj['code'] as string) || code;
        details = obj['details'];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error at ${request.method} ${request.url}: ${exception.stack}`);
    }

    const errorBody: ApiErrorBody = {
      statusCode: status,
      code,
      message,
      details,
      requestId: (request.headers['x-request-id'] as string) || undefined,
    };

    response.status(status).json(errorBody);
  }
}
