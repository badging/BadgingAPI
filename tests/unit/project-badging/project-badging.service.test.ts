import { ProjectBadgingService } from '../../../src/project-badging/services/project-badging.service';
import { GitHubApiService, GitLabApiService, RepoRepository } from '../../../src/shared';
import { DEIScannerService } from '../../../src/project-badging/services/dei-scanner.service';
import { BadgeAwardService } from '../../../src/project-badging/services/badge-award.service';

describe('ProjectBadgingService', () => {
  let service: ProjectBadgingService;
  let githubApiService: jest.Mocked<GitHubApiService>;
  let gitlabApiService: jest.Mocked<GitLabApiService>;
  let repoRepository: jest.Mocked<RepoRepository>;
  let deiScannerService: jest.Mocked<DEIScannerService>;
  let badgeAwardService: jest.Mocked<BadgeAwardService>;

  const mockUser = { id: 1, name: 'Dev', email: 'dev@test.com' };

  beforeEach(() => {
    githubApiService = { getRepositoryInfo: jest.fn(), getFileContentAndSHA: jest.fn() } as any;
    gitlabApiService = { getRepositoryInfo: jest.fn(), getFileContentAndSHA: jest.fn() } as any;
    repoRepository = { 
      findByGithubRepoAndSHA: jest.fn(), 
      findByGitlabRepoAndSHA: jest.fn(),
      getAllBadgedRepos: jest.fn() 
    } as any;
    deiScannerService = { 
      getDEITemplate: jest.fn().mockResolvedValue('# Template'), 
      isTemplateContent: jest.fn().mockReturnValue(false),
      scanDEIContent: jest.fn().mockReturnValue({ isValid: true, missingSections: [] })
    } as any;
    badgeAwardService = { awardBronzeBadge: jest.fn(), sendErrorNotification: jest.fn(), sendFailureNotification: jest.fn() } as any;

    service = new ProjectBadgingService(
      githubApiService,
      gitlabApiService,
      repoRepository,
      deiScannerService,
      badgeAwardService
    );
  });

  

  test('scanRepositories() should badge a GitHub repo successfully', async () => {
    // 1. Mock API Info
    githubApiService.getRepositoryInfo.mockResolvedValue({ 
        data: { id: 123, fullName: 'org/repo', url: 'http://gh.com/repo' }, errors: [] 
    });
    // 2. Mock File Content
    githubApiService.getFileContentAndSHA.mockResolvedValue({ 
        data: { content: 'DEI Content', sha: 'sha1' }, errors: [] 
    });
    // 3. Not already badged
    repoRepository.findByGithubRepoAndSHA.mockResolvedValue(null);
    // 4. Award success
    badgeAwardService.awardBronzeBadge.mockResolvedValue(true);

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [123], 'github');

    expect(results[0].success).toBe(true);
    expect(badgeAwardService.awardBronzeBadge).toHaveBeenCalled();
  });

  test('scanRepositories() should badge a GitLab repo successfully', async () => {
    gitlabApiService.getRepositoryInfo.mockResolvedValue({ 
        data: { id: 456, url: 'http://gl.com/repo', defaultBranch: 'main' }, errors: [] 
    });
    gitlabApiService.getFileContentAndSHA.mockResolvedValue({ 
        data: { content: 'DEI Content', sha: 'sha2' }, errors: [] 
    });
    repoRepository.findByGitlabRepoAndSHA.mockResolvedValue(null);
    badgeAwardService.awardBronzeBadge.mockResolvedValue(true);

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [456], 'gitlab');

    expect(results[0].success).toBe(true);
    expect(gitlabApiService.getRepositoryInfo).toHaveBeenCalledWith(456);
  });

  // ## --- Failure Paths & Logic Gates --- ##

  test('should return failure if DEI.md is missing', async () => {
    githubApiService.getRepositoryInfo.mockResolvedValue({ data: { url: 'url' } as any, errors: [] });
    githubApiService.getFileContentAndSHA.mockResolvedValue({ data: null, errors: ['Not found'] });

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [123], 'github');

    expect(results[0].success).toBe(false);
    expect(results[0].message).toContain('does not have a DEI.md file');
  });

  test('should fail if user provides exact template content', async () => {
    githubApiService.getRepositoryInfo.mockResolvedValue({ data: { id: 1 } as any, errors: [] });
    githubApiService.getFileContentAndSHA.mockResolvedValue({ data: { content: 'template' } as any, errors: [] });
    deiScannerService.isTemplateContent.mockReturnValue(true); // User didn't edit the template

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [1], 'github');

    expect(results[0].success).toBe(false);
    expect(results[0].message).toContain('Please provide DEI information specific to');
  });

  test('should fail if repo is already badged with same SHA', async () => {
    githubApiService.getRepositoryInfo.mockResolvedValue({ data: { id: 1 } as any, errors: [] });
    githubApiService.getFileContentAndSHA.mockResolvedValue({ data: { sha: 'existing-sha' } as any, errors: [] });
    repoRepository.findByGithubRepoAndSHA.mockResolvedValue({ id: 99 } as any); // Found existing record

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [1], 'github');

    expect(results[0].success).toBe(false);
    expect(results[0].message).toContain('was already badged');
  });

  test('should trigger error notification email if any repo fails', async () => {
    githubApiService.getRepositoryInfo.mockResolvedValue({ data: null, errors: ['API Error'] });

    await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [1], 'github');

    expect(badgeAwardService.sendErrorNotification).toHaveBeenCalledWith(
        mockUser.email, mockUser.name, ['API Error']
    );
  });

 

  test('should handle invalid scan result with missing sections', async () => {
    githubApiService.getRepositoryInfo.mockResolvedValue({ data: { id: 1 } as any, errors: [] });
    githubApiService.getFileContentAndSHA.mockResolvedValue({ data: { content: 'bad' } as any, errors: [] });
    deiScannerService.scanDEIContent.mockReturnValue({ isValid: false, missingSections: ['Project Access'] });

    const results = await service.scanRepositories(mockUser.id, mockUser.name, mockUser.email, [1], 'github');

    expect(results[0].success).toBe(false);
    expect(badgeAwardService.sendFailureNotification).toHaveBeenCalled();
  });
});