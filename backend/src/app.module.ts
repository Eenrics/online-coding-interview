import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { InterviewWebSocketGateway } from './websocket/websocket.gateway';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RateLimitModule,
  ],
  controllers: [HealthController, SessionsController],
  providers: [SessionsService, InterviewWebSocketGateway],
  exports: [SessionsService],
})
export class AppModule {}

