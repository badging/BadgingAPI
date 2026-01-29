import { Service } from 'typedi';
import { RepoRepository, MailerService, AugurApiService } from '../../shared';

const BRONZE_BADGE_URL =
  'https://raw.githubusercontent.com/badging/badging/main/src/assets/images/badges/bronze-badge.svg';

@Service()
export class BadgeAwardService {
  constructor(
    private repoRepository: RepoRepository,
    private mailerService: MailerService,
    private augurApiService: AugurApiService
  ) {}

  /**
   * Award bronze badge to a repository
   */
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
      // Generate badge links
      const markdownLink = `![Bronze Badge](${BRONZE_BADGE_URL})`;
      const htmlLink = `&lt;img src=&quot;${BRONZE_BADGE_URL}&quot; alt=&quot;DEI Badging Bronze Badge&quot; /&gt;`;

      // Send success email
      await this.mailerService.sendBadgingEmail(email, userName, 'Bronze', markdownLink, htmlLink);

      // Save repo to database
      const repoId = await this.repoRepository.saveRepo(
        githubRepoId,
        gitlabRepoId,
        deiCommitSHA,
        repoUrl,
        'Bronze',
        markdownLink,
        userId
      );

      if (repoId) {
        // Register with Augur API
        const augurResponse = await this.augurApiService.registerBadgedRepo(
          repoId,
          'bronze',
          repoUrl
        );
        console.log('Augur API response:', augurResponse);
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error awarding bronze badge:', errorMessage);
      return false;
    }
  }

  /**
   * Send failure notification for missing DEI sections
   */
  async sendFailureNotification(
    email: string,
    userName: string,
    missingSections: string[]
  ): Promise<void> {
    const results = missingSections.map((section) => `${section} is missing`).join('\n');
    await this.mailerService.sendBadgingEmail(email, userName, 'Bronze', null, null, results);
  }

  /**
   * Send generic error notification
   */
  async sendErrorNotification(
    email: string,
    userName: string,
    errorMessages: string[]
  ): Promise<void> {
    await this.mailerService.sendBadgingEmail(
      email,
      userName,
      'Bronze',
      null,
      null,
      errorMessages.join('\n')
    );
  }
}
