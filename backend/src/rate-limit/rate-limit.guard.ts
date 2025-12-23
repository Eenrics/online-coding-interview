import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store: RateLimitStore = {};
  private readonly limits = {
    'POST /api/sessions': { max: 10, window: 60000 }, // 10 per minute
    'POST /api/sessions/:sessionId/join': { max: 20, window: 60000 }, // 20 per minute
    default: { max: 100, window: 60000 }, // 100 per minute
  };

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);
    const limit = this.getLimit(request);

    const now = Date.now();
    const record = this.store[key];

    if (!record || now > record.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + limit.window,
      };
      return true;
    }

    if (record.count >= limit.max) {
      throw new HttpException(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: any): string {
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const method = request.method;
    const path = request.route?.path || request.path;
    return `${ip}:${method} ${path}`;
  }

  private getLimit(request: any): { max: number; window: number } {
    const method = request.method;
    const path = request.route?.path || request.path;
    const key = `${method} ${path}`;

    for (const [pattern, limit] of Object.entries(this.limits)) {
      if (pattern === 'default') continue;
      if (key.includes(pattern.replace('/api', ''))) {
        return limit as { max: number; window: number };
      }
    }

    return this.limits.default;
  }
}

