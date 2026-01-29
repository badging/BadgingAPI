import { IsArray, IsNumber, IsString, IsIn, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RepositoryDTO {
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsString()
  fullName?: string;
}

export class ScanReposDTO {
  @IsNumber()
  userId!: number;

  @IsString()
  @IsIn(['github', 'gitlab'])
  provider!: 'github' | 'gitlab';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepositoryDTO)
  repos!: RepositoryDTO[];
}

export class BadgedRepoResponseDTO {
  id!: number;
  githubRepoId?: number | null;
  gitlabRepoId?: number | null;
  repoLink!: string;
  badgeType!: string;
  attachment!: string;
  createdAt!: Date;
  updatedAt!: Date;
  userId!: number;
}
