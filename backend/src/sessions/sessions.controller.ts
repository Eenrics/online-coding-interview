import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from '../common/dto/create-session.dto';
import { JoinSessionDto } from '../common/dto/join-session.dto';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.createSession(createSessionDto.language);
  }

  @Get()
  listSessions(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? Math.min(Math.max(1, limit), 100) : 20;
    const offsetNum = offset ? Math.max(0, offset) : 0;
    return this.sessionsService.listSessions(limitNum, offsetNum);
  }

  @Get(':sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    if (!this.isValidUUID(sessionId)) {
      throw new NotFoundException('Invalid session ID format');
    }
    const session = this.sessionsService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('sessionId') sessionId: string) {
    if (!this.isValidUUID(sessionId)) {
      throw new NotFoundException('Invalid session ID format');
    }
    const deleted = this.sessionsService.deleteSession(sessionId);
    if (!deleted) {
      throw new NotFoundException('Session not found');
    }
  }

  @Post(':sessionId/join')
  @UseGuards(RateLimitGuard)
  joinSession(
    @Param('sessionId') sessionId: string,
    @Body() joinSessionDto: JoinSessionDto,
  ) {
    if (!this.isValidUUID(sessionId)) {
      throw new NotFoundException('Invalid session ID format');
    }
    const result = this.sessionsService.joinSession(
      sessionId,
      joinSessionDto.userId,
      joinSessionDto.userName,
    );
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

