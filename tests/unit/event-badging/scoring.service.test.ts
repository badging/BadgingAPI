import { ScoringService } from '../../../src/event-badging/services/scoring.service';
import { mockGitHubApiService } from '../../mocks/github.mock';
import { createMockOctokit } from '../../mocks/octokit.mock';
import * as envConfig from '../../../src/shared/config/environment';


describe('ScoringService', () => {
  let service: ScoringService;
    let githubApiServiceMock: any;
    let mockOctokit: any;   

  beforeEach(() => {
    mockGitHubApiService.listIssueComments.mockReset();
    githubApiServiceMock = mockGitHubApiService;
    mockOctokit = createMockOctokit();
   

    service = new ScoringService(githubApiServiceMock);

    jest.spyOn(envConfig, 'isDevelopment').mockReturnValue(false);
    jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key) => {
      if (key === 'REPOSITORY_NAME') return 'chaoss-main-repo';
      return '';
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should calculate a GOLD badge (100%) correctly', async () => {
    const mockComments = [{
      user: { type: 'Bot' },
      body: '# Checklist for Reviewer 1\n- [x] 1\n- [x] 2\n- [x] 3\n- [x] 4\n- [x] 5\n- [x] 6\n- [x] 7\n- [x] 8'
    }];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'org', 'repo', 1, 'url', 'other-repo');

    // Math: (8 total - 6 initial) = 2. (8 checked - 6 initial) = 2. 2/2 = 100%.
    expect(result.assigned_badge).toBe('Gold');
    expect(result.reviewResult).toBe(100);
    expect(result.reviewerCount).toBe(1);
  });

  it('should calculate SILVER badge for multiple reviewers with varying scores', async () => {
    const mockComments = [
      {
        user: { type: 'Bot' },
        body: '# Checklist for A\n- [x] 1\n- [x] 2\n- [x] 3\n- [x] 4\n- [x] 5\n- [x] 6\n- [x] 7\n- [x] 8' // 100%
      },
      {
        user: { type: 'Bot' },
        body: '# Checklist for B\n- [x] 1\n- [x] 2\n- [x] 3\n- [x] 4\n- [x] 5\n- [x] 6\n- [x] 7\n- [ ] 8' // 50%
      }
    ];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'org', 'repo', 1, 'url', 'other-repo');

    // Avg: (100 + 50) / 2 = 75%
    expect(result.assigned_badge).toBe('Silver');
    expect(result.reviewResult).toBe(75);
  });

  it('should use initialCheckCount of 4 when repo matches targetRepoName', async () => {
    const repoName = 'chaoss-main-repo';
    const mockComments = [{
      user: { type: 'Bot' },
      body: '# Checklist for\n- [x] 1\n- [x] 2\n- [x] 3\n- [x] 4\n- [x] 5' 
    }];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'o', 'r', 1, 'url', repoName);

    // Math: (5 items - 4 initial) = 1. (5 checked - 4 initial) = 1. Score 100%.
    expect(result.reviewResult).toBe(100);
  });

  it('should throw an error if the GitHub API returns errors', async () => {
    githubApiServiceMock.listIssueComments.mockResolvedValue({
      data: null,
      errors: ['API Rate Limit' as any]
    });

    await expect(service.calculateBadge(mockOctokit, 'o', 'r', 1, 'url', 'repo'))
      .rejects.toThrow('Failed to get comments: API Rate Limit');
  });

  it('should return a Pending badge with 0 score if no checklists are found', async () => {
    const mockComments = [
      { user: { type: 'User' }, body: '# Checklist for Human' }, // Type User, not Bot
      { user: { type: 'Bot' }, body: 'Hello world' }            // No checklist header
    ];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'o', 'r', 1, 'url', 'repo');
    
    expect(result.reviewResult).toBe(0);
    expect(result.assigned_badge).toBe('Pending');
    expect(result.reviewerCount).toBe(0);
  });

  it('should handle scores below 0 by capping positive checks at 0', async () => {
    const mockComments = [{
      user: { type: 'Bot' },
      body: '# Checklist for\n- [x] 1\n- [ ] 2' // Only 1 checked, initial count is 6
    }];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'o', 'r', 1, 'url', 'repo');
    
    // positiveCheckCount becomes Math.max(0, 1 - 6) = 0.
    expect(result.reviewResult).toBe(0);
    expect(result.assigned_badge).toBe('Pending');
  });

  it('should return 0% percentage if total items minus initial count is 0 or less', async () => {
    const mockComments = [{
      user: { type: 'Bot' },
      body: '# Checklist for\n- [x] 1\n- [x] 2\n- [x] 3\n- [x] 4\n- [x] 5\n- [x] 6' 
      // 6 items, 6 initial. Total = 0.
    }];

    githubApiServiceMock.listIssueComments.mockResolvedValue({ data: mockComments as any, errors: [] });

    const result = await service.calculateBadge(mockOctokit, 'o', 'r', 1, 'url', 'repo');
    expect(result.reviewResult).toBe(0);
  });
});