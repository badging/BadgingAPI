import axios from 'axios';
import { GitLabApiService } from '../../../../../src/shared/providers/gitlab/gitlab-api.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GitLabApiService', () => {
  let service: GitLabApiService;
  const mockToken = 'glpat-12345';

  beforeEach(() => {
    service = new GitLabApiService();
    jest.clearAllMocks();
  });

  

  test('getUserInfo() should map GitLab user data to internal IUserInfo', async () => {
    const gitLabUser = {
      username: 'johndoe',
      name: 'John Doe',
      email: 'john@example.com',
      id: 99,
    };

    mockedAxios.get.mockResolvedValueOnce({ data: gitLabUser });

    const result = await service.getUserInfo(mockToken);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/user'),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${mockToken}`, Accept: 'application/json' }
      })
    );
    expect(result.data).toEqual({
      login: 'johndoe',
      name: 'John Doe',
      email: 'john@example.com',
      id: 99,
    });
    expect(result.errors).toHaveLength(0);
  });

  test('getUserRepositories() should handle multi-page pagination', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 1, path_with_namespace: 'org/repo1' }],
      headers: { 'x-next-page': '2' },
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 2, path_with_namespace: 'org/repo2' }],
      headers: {},
    });

    const result = await service.getUserRepositories(mockToken);

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(2);
    expect(result.data![1].fullName).toBe('org/repo2');
  });

  test('getFileContentAndSHA() should decode base64 content correctly', async () => {
    const base64Content = Buffer.from('Hello GitLab').toString('base64');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        last_commit_id: 'sha-123',
        content: base64Content,
      },
    });

    const result = await service.getFileContentAndSHA(123, 'README.md', 'main');

    expect(result.data?.content).toBe('Hello GitLab');
    expect(result.data?.sha).toBe('sha-123');
  });

  

  test('getUserInfo() should return error message on API failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

    const result = await service.getUserInfo(mockToken);

    expect(result.data).toBeNull();
    expect(result.errors).toContain('Unauthorized');
  });

  test('getUserRepositories() should return partial data if an error occurs during pagination', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 1, path_with_namespace: 'org/repo1' }],
      headers: { 'x-next-page': '2' },
    });
  
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Timeout'));

    const result = await service.getUserRepositories(mockToken);

    expect(result.data).toHaveLength(1);
    expect(result.errors).toContain('Network Timeout');
  });

 

  test('getUserInfo() should fallback to username if name is missing', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { username: 'ghost', id: 1, email: null }
    });

    const result = await service.getUserInfo(mockToken);

    expect(result.data?.name).toBe('ghost');
    expect(result.data?.email).toBe('');
  });

  test('getRepositoryInfo() should handle repository search by ID', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 500, web_url: 'http://gitlab.com/repo', default_branch: 'develop' }
    });

    const result = await service.getRepositoryInfo(500);

    expect(result.data?.defaultBranch).toBe('develop');
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/projects/500'), expect.any(Object));
  });
});