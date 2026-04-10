import { Octokit } from '@octokit/rest';

export const mockOctokit = {} as unknown as Octokit; 

export const createMockOctokit = () => ({
  users: {
    getAuthenticated: jest.fn(),
  },
  repos: {
    listForAuthenticatedUser: jest.fn(),
    getContent: jest.fn(),
  },
  rest: {
    issues: {
      create: jest.fn(),
      createComment: jest.fn(),
      listComments: jest.fn(),
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
      update: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
    }
  },
  request: jest.fn(),
});