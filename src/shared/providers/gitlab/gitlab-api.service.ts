import { Service } from 'typedi';
import axios from 'axios';
import {
  IOperationResult,
  IUserInfo,
  IRepositoryInfo,
  IRepositoryDetails,
  IFileContent,
} from '../../types';

@Service()
export class GitLabApiService {
  private readonly baseUrl = 'https://gitlab.com/api/v4';

  /**
   * Get authenticated user info
   */
  async getUserInfo(accessToken: string): Promise<IOperationResult<IUserInfo>> {
    try {
      const { data } = await axios.get<{
        username: string;
        name: string;
        email: string;
        id: number;
      }>(`${this.baseUrl}/user`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        data: {
          login: data.username,
          name: data.name || data.username,
          email: data.email || '',
          id: data.id,
        },
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get user's public repositories
   */
  async getUserRepositories(accessToken: string): Promise<IOperationResult<IRepositoryInfo[]>> {
    const repositories: IRepositoryInfo[] = [];

    try {
      const requestHeaders = {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      let hasMorePages = true;
      let pageIndex = 1;

      while (hasMorePages) {
        const response = await axios.get<Array<{ id: number; path_with_namespace: string }>>(
          `${this.baseUrl}/projects?owned=true&visibility=public&per_page=100&page=${pageIndex}`,
          { headers: requestHeaders }
        );

        const { data, headers } = response;
        hasMorePages = !!headers['x-next-page'];
        pageIndex++;

        repositories.push(
          ...data.map((repo) => ({
            id: repo.id,
            fullName: repo.path_with_namespace,
          }))
        );
      }

      return {
        data: repositories,
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: repositories.length > 0 ? repositories : null,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get repository info by ID
   */
  async getRepositoryInfo(repositoryId: number): Promise<IOperationResult<IRepositoryDetails>> {
    try {
      const { data } = await axios.get<{
        id: number;
        web_url: string;
        default_branch: string;
      }>(`${this.baseUrl}/projects/${repositoryId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      return {
        data: {
          id: repositoryId,
          url: data.web_url,
          defaultBranch: data.default_branch,
        },
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get file content and commit SHA from a repository
   */
  async getFileContentAndSHA(
    repositoryId: number,
    filePath: string,
    branch: string
  ): Promise<IOperationResult<IFileContent>> {
    try {
      const { data } = await axios.get<{
        last_commit_id: string;
        content: string;
      }>(`${this.baseUrl}/projects/${repositoryId}/repository/files/${filePath}?ref=${branch}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      return {
        data: {
          sha: data.last_commit_id,
          content: Buffer.from(data.content, 'base64').toString(),
        },
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        errors: [errorMessage],
      };
    }
  }
}
