import request from 'supertest';
import { Container } from 'typedi';
import { useContainer } from 'routing-controllers';
import type { Express } from 'express';

import { createApp } from '../../src/app';
import {
  setupTestDB,
  teardownTestDB,
  seedUser,
} from '../mocks/database.mock';

import { Repo } from '../../src/shared/data-access/models/repo.model';
import {
  GitHubApiService,
  GitLabApiService,
  RepoRepository,
  MailerService,
  AugurApiService,
} from '../../src/shared';
import {
  DEIScannerService,
  BadgeAwardService,
} from '../../src/project-badging/services';

describe('Project Badging E2E', () => {
  let app: Express;

  const mockGitHubApiService = {
    getRepositoryInfo: jest.fn(),
    getFileContentAndSHA: jest.fn(),
  };

  const mockGitLabApiService = {
    getRepositoryInfo: jest.fn(),
    getFileContentAndSHA: jest.fn(),
  };

  const mockDEIScannerService = {
    getDEITemplate: jest.fn(),
    scanDEIContent: jest.fn(),
    isTemplateContent: jest.fn(),
  };

  const mockMailerService = {
    sendBadgingEmail: jest.fn().mockResolvedValue(true),
    sendErrorNotification: jest.fn().mockResolvedValue(true),
  };

  const mockAugurApiService = {
    registerBadgedRepo: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    useContainer(Container);
    await setupTestDB();

    Container.set(GitHubApiService, mockGitHubApiService as any);
    Container.set(GitLabApiService, mockGitLabApiService as any);
    Container.set(DEIScannerService, mockDEIScannerService as any);
    Container.set(MailerService, mockMailerService as any);
    Container.set(AugurApiService, mockAugurApiService as any);

    Container.set(RepoRepository, new RepoRepository());

    const badgeAwardService = new BadgeAwardService(
      Container.get(RepoRepository),
      Container.get(MailerService),
      Container.get(AugurApiService)
    );
    Container.set(BadgeAwardService, badgeAwardService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDB();
    Container.reset();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMailerService.sendBadgingEmail.mockResolvedValue(true);
    mockMailerService.sendErrorNotification.mockResolvedValue(true);
    mockAugurApiService.registerBadgedRepo.mockResolvedValue({ success: true });
    await Repo.destroy({ where: {} });
  });

  describe('POST /api/repos-to-badge', () => {
    it('runs the full GitHub badging flow end-to-end and persists a Bronze badge', async () => {
      const user = await seedUser();

      mockGitHubApiService.getRepositoryInfo.mockResolvedValue({
        data: { id: 101, fullName: 'org/repo-101', url: 'https://github.com/org/repo-101' },
        errors: [],
      });
      mockGitHubApiService.getFileContentAndSHA.mockResolvedValue({
        data: { content: 'valid DEI content', sha: 'sha-101' },
        errors: [],
      });
      mockDEIScannerService.getDEITemplate.mockResolvedValue('template');
      mockDEIScannerService.isTemplateContent.mockReturnValue(false);
      mockDEIScannerService.scanDEIContent.mockReturnValue({
        isValid: true,
        missingSections: [],
      });

      const res = await request(app)
        .post('/api/repos-to-badge')
        .send({
          userId: user.id,
          provider: 'github',
          repos: [{ id: 101 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].success).toBe(true);
      expect(res.body.results[0].message).toBe('Badge awarded successfully');

      expect(mockMailerService.sendBadgingEmail).toHaveBeenCalledTimes(1);
      expect(mockMailerService.sendBadgingEmail).toHaveBeenCalledWith(
        user.email,
        user.name,
        'Bronze',
        expect.stringContaining('![Bronze Badge]'),
        expect.stringContaining('<img')
      );

      const saved = await Repo.findOne({
        where: { githubRepoId: 101, DEICommitSHA: 'sha-101' },
      });
      expect(saved).not.toBeNull();
      expect(saved!.badgeType).toBe('Bronze');
      expect(saved!.userId).toBe(user.id);
    });

    it('runs the full GitLab badging flow end-to-end', async () => {
      const user = await seedUser({ email: 'gitlab@example.com', login: 'gluser' });

      mockGitLabApiService.getRepositoryInfo.mockResolvedValue({
        data: {
          id: 202,
          fullName: 'group/repo-202',
          url: 'https://gitlab.com/group/repo-202',
          defaultBranch: 'main',
        },
        errors: [],
      });
      mockGitLabApiService.getFileContentAndSHA.mockResolvedValue({
        data: { content: 'valid DEI content', sha: 'sha-202' },
        errors: [],
      });
      mockDEIScannerService.getDEITemplate.mockResolvedValue('template');
      mockDEIScannerService.isTemplateContent.mockReturnValue(false);
      mockDEIScannerService.scanDEIContent.mockReturnValue({
        isValid: true,
        missingSections: [],
      });

      const res = await request(app)
        .post('/api/repos-to-badge')
        .send({
          userId: user.id,
          provider: 'gitlab',
          repos: [{ id: 202 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.results[0].success).toBe(true);

      const saved = await Repo.findOne({
        where: { gitlabRepoId: 202, DEICommitSHA: 'sha-202' },
      });
      expect(saved).not.toBeNull();
      expect(saved!.badgeType).toBe('Bronze');
    });

    it('does not re-badge the same repo + commit SHA twice', async () => {
      const user = await seedUser();

      mockGitHubApiService.getRepositoryInfo.mockResolvedValue({
        data: { id: 303, fullName: 'org/repo-303', url: 'https://github.com/org/repo-303' },
        errors: [],
      });
      mockGitHubApiService.getFileContentAndSHA.mockResolvedValue({
        data: { content: 'valid', sha: 'sha-303' },
        errors: [],
      });
      mockDEIScannerService.getDEITemplate.mockResolvedValue('template');
      mockDEIScannerService.isTemplateContent.mockReturnValue(false);
      mockDEIScannerService.scanDEIContent.mockReturnValue({
        isValid: true,
        missingSections: [],
      });

      const first = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'github',
        repos: [{ id: 303 }],
      });
      expect(first.status).toBe(200);
      expect(first.body.results[0].success).toBe(true);

      const second = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'github',
        repos: [{ id: 303 }],
      });
      expect(second.status).toBe(200);
      expect(second.body.results[0].success).toBe(false);
      expect(second.body.results[0].message).toContain('was already badged');

      const repos = await Repo.findAll({ where: { githubRepoId: 303 } });
      expect(repos).toHaveLength(1);
    });

    it('handles mixed success and failure across multiple repos', async () => {
      const user = await seedUser();

      mockGitHubApiService.getRepositoryInfo
        .mockResolvedValueOnce({
          data: { id: 401, fullName: 'org/repo-401', url: 'https://github.com/org/repo-401' },
          errors: [],
        })
        .mockResolvedValueOnce({
          data: { id: 402, fullName: 'org/repo-402', url: 'https://github.com/org/repo-402' },
          errors: [],
        });

      mockGitHubApiService.getFileContentAndSHA
        .mockResolvedValueOnce({
          data: { content: 'valid', sha: 'sha-401' },
          errors: [],
        })
        .mockResolvedValueOnce({
          data: null,
          errors: ['DEI.md not found'],
        });

      mockDEIScannerService.getDEITemplate.mockResolvedValue('template');
      mockDEIScannerService.isTemplateContent.mockReturnValue(false);
      mockDEIScannerService.scanDEIContent.mockReturnValue({
        isValid: true,
        missingSections: [],
      });

      const res = await request(app)
        .post('/api/repos-to-badge')
        .send({
          userId: user.id,
          provider: 'github',
          repos: [{ id: 401 }, { id: 402 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].success).toBe(true);
      expect(res.body.results[1].success).toBe(false);
      expect(res.body.results[1].message).toContain('does not have a DEI.md file');
    });

    it('returns 400 when provider is missing', async () => {
      const user = await seedUser();

      const res = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        repos: [{ id: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Provider is required');
    });

    it('returns 400 for an unsupported provider', async () => {
      const user = await seedUser();

      const res = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'bitbucket',
        repos: [{ id: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid provider');
    });

    it('returns 400 when userId is missing', async () => {
      const res = await request(app).post('/api/repos-to-badge').send({
        provider: 'github',
        repos: [{ id: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('UserId is required');
    });

    it('returns 400 when no repos are selected', async () => {
      const user = await seedUser();

      const res = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'github',
        repos: [],
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No repositories selected');
    });

    it('returns 404 when the user does not exist', async () => {
      const res = await request(app).post('/api/repos-to-badge').send({
        userId: 999999,
        provider: 'github',
        repos: [{ id: 1 }],
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('User not found');
    });
  });

  describe('GET /api/badgedRepos', () => {
    it('returns an empty list when no repos have been badged', async () => {
      const res = await request(app).get('/api/badgedRepos');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('returns all badged repos after a successful badging flow', async () => {
      const user = await seedUser();

      await Repo.create({
        githubRepoId: 555,
        DEICommitSHA: 'sha-555',
        repoLink: 'https://github.com/org/repo-555',
        badgeType: 'Bronze',
        attachment: '',
        userId: user.id,
      } as any);

      const res = await request(app).get('/api/badgedRepos');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/project-badging-successful', () => {
    it('renders the success HTML page with query params', async () => {
      const res = await request(app)
        .get('/api/project-badging-successful')
        .query({
          provider: 'github',
          userId: '42',
          name: 'Jane Doe',
          email: 'jane@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Badge Scan Successful!');
      expect(res.text).toContain('Jane Doe');
      expect(res.text).toContain('jane@example.com');
      expect(res.text).toContain('github');
      expect(res.text).toContain('42');
    });
  });
});
