import { Service } from 'typedi';
import {
  RepoRepository,
  MailerService,
  AugurApiService,
} from '../../shared';

import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';

const BRONZE_BADGE_URL =
  'https://raw.githubusercontent.com/badging/badging/main/src/assets/images/badges/bronze-badge.svg';

@Service()
export class BadgeAwardService {
  constructor(
    private repoRepository: RepoRepository,
    private mailerService: MailerService,
    private augurApiService: AugurApiService
  ) {}

  async awardBronzeBadge(
    userId: number,
    userName: string,
    email: string,
    githubRepoId: number | null,
    gitlabRepoId: number | null,
    repoUrl: string,
    deiCommitSHA: string
  ): Promise<boolean> {
    try {
      const markdownLink = `![Bronze Badge](${BRONZE_BADGE_URL})`;
      const htmlLink = `<img src="${BRONZE_BADGE_URL}" alt="DEI Badging Bronze Badge" />`;

      await this.mailerService.sendBadgingEmail(
        email,
        userName,
        'Bronze',
        markdownLink,
        htmlLink
      );
      // console.log(
      //   `Sending badging email to ${email} with badge links and username: ${userName}, ${markdownLink}, ${htmlLink}`
      // );

      const repoId = await this.repoRepository.saveRepo(
        githubRepoId,
        gitlabRepoId,
        deiCommitSHA,
        repoUrl,
        'Bronze',
        markdownLink,
        userId
      );

      if (!repoId) {
        logger.error('Failed to save repo during badge award', {
          userId,
          repoUrl,
        });

        return false;
      }

      const augurResponse =
        await this.augurApiService.registerBadgedRepo(
          repoId,
          'bronze',
          repoUrl
        );

      logger.info('Augur API response', {
        repoId,
        response: augurResponse,
      });

      return true;
    } catch (error: unknown) {
      logger.error('Badge award failed', {
        error: error instanceof Error ? error.message : error,
        userId,
        repoUrl,
      });

      throw new AppError(
        'Badge awarding process failed',
        500,
        error,
        {
          userId,
          repoUrl,
        }
      );
    }
  }

  async sendFailureNotification(
    email: string,
    userName: string,
    missingSections: string[]
  ): Promise<void> {
    try {
      const results = missingSections
        .map((section) => `${section} is missing`)
        .join('\n');

      await this.mailerService.sendBadgingEmail(
        email,
        userName,
        'Bronze',
        null,
        null,
        results
      );
      // console.log(
      //   `Sending failure notification email to ${email} and ${userName} with missing sections: ${results}`
      // );
    } catch (error: unknown) {
      logger.error('Failure notification email failed', {
        error: error instanceof Error ? error.message : error,
        email,
      });

      throw new AppError(
        'Failed to send failure notification',
        500,
        error
      );
    }
  }

  async sendErrorNotification(
    email: string,
    userName: string,
    errorMessages: string[]
  ): Promise<void> {
    try {
      // console.log(
      //   `Sending error notification email to ${email} and ${userName} with error messages: ${errorMessages.join(', ')}`
      // );

      await this.mailerService.sendBadgingEmail(
        email,
        userName,
        'Bronze',
        null,
        null,
        errorMessages.join('\n')
      );
    } catch (error: unknown) {
      logger.error('Error notification email failed', {
        error: error instanceof Error ? error.message : error,
        email,
      });

      throw new AppError(
        'Failed to send error notification',
        500,
        error
      );
    }
  }
}