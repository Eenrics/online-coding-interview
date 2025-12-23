import { IsEnum, IsNotEmpty } from 'class-validator';
import { Language } from '../enums/language.enum';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsEnum(Language)
  language: Language;
}

