import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinSessionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  userId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userName: string;
}

