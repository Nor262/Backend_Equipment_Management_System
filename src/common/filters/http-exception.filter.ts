import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = 
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Chỉ log lỗi server thật (5xx) hoặc lỗi không mong đợi
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} - ${status}`, exception instanceof Error ? exception.stack : '');
    } else if (status !== 401 && status !== 404) {
      // Log warning cho 400, 403, etc. nhưng không log 401/404 (quá nhiều noise)
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json({
      status: 'error',
      message: typeof message === 'object' && message !== null && 'message' in message 
        ? (message as any).message 
        : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
