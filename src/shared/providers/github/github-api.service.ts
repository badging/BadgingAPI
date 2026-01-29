import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import {
  IOperationResult,
  IUserInfo,
  IRepositoryInfo,
  IRepositoryDetails,
  IFileContent,
} from '../../types';

@Service()
export class GitHubApiService {
  /**
   * Get authenticated user info
   */
  async getUserInfo(octokit: Octokit): Promise<IOperationResult<IUserInfo>> {
    try {
      const response = await octokit.users.getAuthenticated();
      const {
        data: { login, name, email, id },
      } = response;

      return {
        data: {
          login,
          name: name || login, // Fallback to login if name is null
          email: email || '',
          id,
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
  async getUserRepositories(octokit: Octokit): Promise<IOperationResult<IRepositoryInfo[]>> {
    try {
      const repos: IRepositoryInfo[] = [];
      let page = 1;

      let response = await octokit.repos.listForAuthenticatedUser({
        visibility: 'public',
        per_page: 100,
        page,
      });

      while (response.data.length > 0) {
        repos.push(
          ...response.data.map((repo) => ({
            id: repo.id,
            fullName: repo.full_name,
          }))
        );

        page++;
        response = await octokit.repos.listForAuthenticatedUser({
          visibility: 'public',
          per_page: 100,
          page,
        });
      }

      return {
        data: repos,
        errors: [],
      };
    } catch (error) {
      return {
        data: null,
        errors: ['GitHub API returning no repository(ies).'],
      };
    }
  }

  /**
   * Get repository info by ID
   */
  async getRepositoryInfo(
    octokit: Octokit,
    repositoryId: number
  ): Promise<IOperationResult<IRepositoryDetails>> {
    try {
      const response = await octokit.request('GET /repositories/{repositoryId}', {
        repositoryId,
      });
      const { id, html_url, full_name } = response.data as {
        id: number;
        html_url: string;
        full_name: string;
      };

      return {
        data: {
          id,
          url: html_url,
          fullName: full_name,
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
   * Get repository info (unauthenticated - by ID)
   */
  async getRepositoryInfoPublic(
    repositoryId: number
  ): Promise<IOperationResult<IRepositoryDetails>> {
    const octokit = new Octokit();
    return this.getRepositoryInfo(octokit, repositoryId);
  }

  /**
   * Get file content and SHA from a repository
   */
  async getFileContentAndSHA(
    octokit: Octokit,
    repositoryFullName: string,
    filePath: string
  ): Promise<IOperationResult<IFileContent>> {
    try {
      const [owner, repo] = repositoryFullName.split('/');

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });

      // Type guard - ensure we got a file, not an array of files
      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
        return {
          data: null,
          errors: ['Path does not point to a file'],
        };
      }

      return {
        data: {
          sha: data.sha,
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

  /**
   * Get file content (unauthenticated)
   */
  async getFileContentPublic(
    repositoryFullName: string,
    filePath: string
  ): Promise<IOperationResult<IFileContent>> {
    const octokit = new Octokit();
    return this.getFileContentAndSHA(octokit, repositoryFullName, filePath);
  }

  /**
   * Create an issue in a repository
   */
  async createIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    title: string,
    body: string
  ): Promise<IOperationResult<{ url: string; number: number }>> {
    try {
      const { data: issue } = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
      });

      return {
        data: {
          url: issue.html_url,
          number: issue.number,
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
   * Create a comment on an issue
   */
  async createIssueComment(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<IOperationResult<{ id: number }>> {
    try {
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });

      return {
        data: { id: data.id },
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
   * List comments on an issue
   */
  async listIssueComments(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<
    IOperationResult<Array<{ id: number; body: string; user: { type: string; login: string } }>>
  > {
    try {
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
      });

      return {
        data: comments.map((comment) => ({
          id: comment.id,
          body: comment.body || '',
          user: {
            type: comment.user?.type || '',
            login: comment.user?.login || '',
          },
        })),
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
   * Add labels to an issue
   */
  async addLabels(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ): Promise<IOperationResult<boolean>> {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels,
      });

      return { data: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, errors: [errorMessage] };
    }
  }

  /**
   * Remove a label from an issue
   */
  async removeLabel(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<IOperationResult<boolean>> {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });

      return { data: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, errors: [errorMessage] };
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IOperationResult<boolean>> {
    try {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      return { data: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, errors: [errorMessage] };
    }
  }

  /**
   * Get repository content (for reading markdown files)
   */
  async getRepoContent(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string
  ): Promise<IOperationResult<string>> {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
        return {
          data: null,
          errors: ['Path does not point to a file'],
        };
      }

      const content = Buffer.from(data.content, 'base64').toString();
      return { data: content, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, errors: [errorMessage] };
    }
  }
}
