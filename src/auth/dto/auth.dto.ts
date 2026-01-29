import { IsString, IsOptional, IsIn } from 'class-validator';
import { Provider } from '../../shared/types';

export class LoginDTO {
  @IsString()
  @IsIn(['github', 'gitlab'])
  provider!: Provider;
}

export class OAuthCallbackDTO {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class EventBadgingAuthDTO {
  @IsString()
  type!: 'event-badging';

  @IsString()
  title!: string;

  @IsString()
  body!: string;
}
