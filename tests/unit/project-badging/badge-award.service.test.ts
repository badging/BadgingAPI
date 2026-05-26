import { BadgeAwardService } from '../../../src/project-badging/services/badge-award.service';
import { RepoRepository, MailerService, AugurApiService } from '../../../src/shared';

describe('BadgeAwardService', () => {
  let service: BadgeAwardService;
  let repoRepository: jest.Mocked<RepoRepository>;
  let mailerService: jest.Mocked<MailerService>;
  let augurApiService: jest.Mocked<AugurApiService>;

  const mockUser = {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@chaoss.org'
  };

  const mockRepoDetails = {
    githubId: 12345,
    gitlabId: null,
    url: 'https://github.com/org/repo',
    sha: 'dei-sha-789'
  };

  beforeEach(() => {
    repoRepository = { saveRepo: jest.fn() } as any;
    mailerService = { sendBadgingEmail: jest.fn() } as any;
    augurApiService = { registerBadgedRepo: jest.fn() } as any;

    service = new BadgeAwardService(
      repoRepository,
      mailerService,
      augurApiService
    );

    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  it('should successfully award a bronze badge and register with Augur', async () => {
    repoRepository.saveRepo.mockResolvedValue(101); // Returns a DB ID
    mailerService.sendBadgingEmail.mockResolvedValue(true);
    augurApiService.registerBadgedRepo.mockResolvedValue({ status: 'success' } as any);

    const result = await service.awardBronzeBadge(
      mockUser.id,
      mockUser.name,
      mockUser.email,
      mockRepoDetails.githubId,
      mockRepoDetails.gitlabId,
      mockRepoDetails.url,
      mockRepoDetails.sha
    );

    expect(result).toBe(true);
    expect(mailerService.sendBadgingEmail).toHaveBeenCalledWith(
      mockUser.email, mockUser.name, 'Bronze', expect.any(String), expect.any(String)
    );
    expect(repoRepository.saveRepo).toHaveBeenCalledWith(
      mockRepoDetails.githubId, null, mockRepoDetails.sha, mockRepoDetails.url, 'Bronze', expect.any(String), mockUser.id
    );
    // Verify Augur Registration
    expect(augurApiService.registerBadgedRepo).toHaveBeenCalledWith(101, 'bronze', mockRepoDetails.url);
  });

  it('should send failure notification with correctly formatted missing sections', async () => {
    const missing = ['Project License', 'Code of Conduct'];
    
    await service.sendFailureNotification(mockUser.email, mockUser.name, missing);

    const expectedResults = 'Project License is missing\nCode of Conduct is missing';
    expect(mailerService.sendBadgingEmail).toHaveBeenCalledWith(
      mockUser.email, 
      mockUser.name, 
      'Bronze', 
      null, 
      null, 
      expectedResults
    );
  });

   it('should return false if repoRepository fails to save the record', async () => {
    repoRepository.saveRepo.mockResolvedValue(null); 

    const result = await service.awardBronzeBadge(
      mockUser.id, mockUser.name, mockUser.email, 1, null, 'url', 'sha'
    );

    expect(result).toBe(false);
    expect(augurApiService.registerBadgedRepo).not.toHaveBeenCalled();
  });

  it('should throw AppError if mailerService throws', async () => {
    mailerService.sendBadgingEmail.mockRejectedValue(new Error('SMTP Down'));

    await expect(
      service.awardBronzeBadge(
        mockUser.id, mockUser.name, mockUser.email, 1, null, 'url', 'sha'
      )
    ).rejects.toThrow('Badge awarding process failed');
  });

   it('should handle GitLab repository IDs correctly when GitHub ID is null', async () => {
    repoRepository.saveRepo.mockResolvedValue(202);

    await service.awardBronzeBadge(
      mockUser.id, mockUser.name, mockUser.email, null, 999, 'url', 'sha'
    );

    expect(repoRepository.saveRepo).toHaveBeenCalledWith(
      null, 999, 'sha', 'url', 'Bronze', expect.any(String), mockUser.id
    );
  });

  it('should format generic error messages correctly in sendErrorNotification', async () => {
    const errors = ['API Error', 'Timeout'];
    await service.sendErrorNotification(mockUser.email, mockUser.name, errors);

    expect(mailerService.sendBadgingEmail).toHaveBeenCalledWith(
      mockUser.email, 
      mockUser.name, 
      'Bronze', 
      null, 
      null, 
      'API Error\nTimeout'
    );
  });
});