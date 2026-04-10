import { GitHubApiService } from '../../../../../src/shared/providers/github/github-api.service';
import { createMockOctokit } from '../../../../mocks/octokit.mock';

describe('GitHubApiService', () => {
  let service: GitHubApiService;
  let mockOctokit: any;

  beforeEach(() => {
    service = new GitHubApiService();
    mockOctokit = createMockOctokit();
  });

  describe('getUserInfo', () => {
    it('should return user info on success', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'tester', name: 'Test User', email: 'test@test.com', id: 1 },
      });

      const result = await service.getUserInfo(mockOctokit);

      expect(result.data?.login).toBe('tester');
      expect(result.errors).toHaveLength(0);
    });

    it('should fallback to login if name is null', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'tester', name: null, email: null, id: 1 },
      });

      const result = await service.getUserInfo(mockOctokit);
      expect(result.data?.name).toBe('tester');
    });

    it('should return error message on failure', async () => {
      mockOctokit.users.getAuthenticated.mockRejectedValue(new Error('Bad Credentials'));

      const result = await service.getUserInfo(mockOctokit);
      expect(result.data).toBeNull();
      expect(result.errors).toContain('Bad Credentials');
    });
  });

  describe('getUserRepositories (Pagination)', () => {
    it('should fetch all pages of repositories', async () => {
      // First call returns 1 repo, second call returns 0 (ends loop)
      mockOctokit.repos.listForAuthenticatedUser
        .mockResolvedValueOnce({ data: [{ id: 1, full_name: 'repo/1' }] })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getUserRepositories(mockOctokit);

      expect(result.data).toHaveLength(1);
      expect(mockOctokit.repos.listForAuthenticatedUser).toHaveBeenCalledTimes(2);
    });

    it('should return specific error message on failure', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue(new Error('API Down'));

      const result = await service.getUserRepositories(mockOctokit);
      expect(result.errors).toContain('GitHub API returning no repository(ies).');
    });
  });

  describe('getFileContentAndSHA', () => {
    it('should decode base64 content correctly', async () => {
      const base64Content = Buffer.from('hello world').toString('base64');
      mockOctokit.repos.getContent.mockResolvedValue({
        data: { type: 'file', content: base64Content, sha: 'abc123' },
      });

      const result = await service.getFileContentAndSHA(mockOctokit, 'owner/repo', 'file.md');

      expect(result.data?.content).toBe('hello world');
      expect(result.data?.sha).toBe('abc123');
    });

    it('should return error if path is a directory (array response)', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({ data: [{ name: 'file1.md' }] });

      const result = await service.getFileContentAndSHA(mockOctokit, 'owner/repo', 'folder/');
      expect(result.errors).toContain('Path does not point to a file');
    });
  });

  describe('Issue Management', () => {
    it('should close an issue by calling update with state closed', async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });

      const result = await service.closeIssue(mockOctokit, 'owner', 'repo', 1);

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 1,
        state: 'closed',
      });
      expect(result.data).toBe(true);
    });

    it('should return mapped comments with user info', async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [
          { id: 1, body: 'test body', user: { type: 'Bot', login: 'chaoss-bot' } }
        ]
      });

      const result = await service.listIssueComments(mockOctokit, 'o', 'r', 1);

      expect(result.data![0].user.type).toBe('Bot');
      expect(result.data![0].body).toBe('test body');
    });
  });
});