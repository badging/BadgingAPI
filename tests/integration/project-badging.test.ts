import request from 'supertest';
import { Container } from 'typedi';
import express from 'express';
import { useExpressServer, useContainer } from 'routing-controllers';

import {
  setupTestDB,
  teardownTestDB,
  seedUser,
} from '../mocks/database.mock';

import { Repo } from '../../src/shared/data-access/models/repo.model';
import { ProjectBadgingController } from '../../src/project-badging/controllers/project-badging.controller';
import { GitHubApiService, GitLabApiService, RepoRepository, MailerService, AugurApiService } from '../../src/shared';
import { DEIScannerService, BadgeAwardService } from '../../src/project-badging/services';
describe('ProjectBadgingController Integration', () => {
  let app: express.Express;

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

  app = express();
  app.use(express.json());

  useExpressServer(app, {
    controllers: [ProjectBadgingController],
    defaultErrorHandler: true,
  });
});

  afterAll(async () => {
    await teardownTestDB();
    Container.reset();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
   
    await Repo.destroy({ where: {} });
  });

  it('should badge a repo successfully', async () => {
    const user = await seedUser();

    const githubService = Container.get(GitHubApiService) as any;
    const deiService = Container.get(DEIScannerService) as any;

    githubService.getRepositoryInfo.mockResolvedValue({
      data: { id: 1, fullName: 'repo', url: 'url' },
      errors: [],
    });
    githubService.getFileContentAndSHA.mockResolvedValue({
      data: { content: 'valid DEI content', sha: 'sha-1' },
      errors: [],
    });
    deiService.getDEITemplate.mockResolvedValue('template');
    deiService.isTemplateContent.mockReturnValue(false);
    deiService.scanDEIContent.mockReturnValue({ isValid: true, missingSections: [] });

    const res = await request(app)
      .post('/api/repos-to-badge')
      .send({
        userId: user.id,
        provider: 'github',
        repos: [{ id: 1 }],
      });

    console.log('Response:', res.body);
    expect(res.status).toBe(200);
    expect(res.body.results[0].success).toBe(true);
    expect(res.body.results[0].message).toBe('Badge awarded successfully');
    expect(mockMailerService.sendBadgingEmail).toHaveBeenCalledTimes(1);
    expect(mockMailerService.sendBadgingEmail).toHaveBeenCalledWith(
    user.email,
    user.name,
    'Bronze',
    expect.stringContaining('![Bronze Badge]'),
    expect.stringContaining('&lt;img')
    );

    const saved = await Repo.findOne({ where: { githubRepoId: 1, DEICommitSHA: 'sha-1' } });
    expect(saved).not.toBeNull();
    expect(saved!.badgeType).toBe('Bronze');
  });

  it('should not badge the same repo/commit twice', async () => {
    const user = await seedUser();

    const githubService = Container.get(GitHubApiService) as any;
    const deiService = Container.get(DEIScannerService) as any;

    githubService.getRepositoryInfo.mockResolvedValue({
      data: { id: 2, fullName: 'repo2', url: 'url2' },
      errors: [],
    });
    githubService.getFileContentAndSHA.mockResolvedValue({
      data: { content: 'valid', sha: 'sha-dup' },
      errors: [],
    });
    deiService.getDEITemplate.mockResolvedValue('template');
    deiService.isTemplateContent.mockReturnValue(false);
    deiService.scanDEIContent.mockReturnValue({ isValid: true, missingSections: [] });

    await request(app).post('/api/repos-to-badge').send({
      userId: user.id,
      provider: 'github',
      repos: [{ id: 2 }],
    });

    const res2 = await request(app).post('/api/repos-to-badge').send({
      userId: user.id,
      provider: 'github',
      repos: [{ id: 2 }],
    });

    expect(res2.status).toBe(200);
    expect(res2.body.results[0].success).toBe(false);
    expect(res2.body.results[0].message).toContain('was already badged');
  });


  it('should return 400 for invalid provider', async () => {
      const user = await seedUser();
      const res = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'bitbucket',
        repos: [{ id: 1 }],
      });
  
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unknown provider');
    });
  
    it('should return 404 for non-existent user', async () => {
      const res = await request(app).post('/api/repos-to-badge').send({
        userId: 9999,
        provider: 'github',
        repos: [{ id: 1 }],
      });
  
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('User not found');
    });
  
    it('should handle partial success/failure', async () => {
      const user = await seedUser();
  
      const githubService = Container.get(GitHubApiService) as any;
      const deiService = Container.get(DEIScannerService) as any;
  
      githubService.getRepositoryInfo.mockResolvedValueOnce({
        data: { id: 10, fullName: 'repo10', url: 'url10' },
        errors: [],
      });
      githubService.getFileContentAndSHA.mockResolvedValueOnce({
        data: { content: 'valid', sha: 'sha10' },
        errors: [],
      });
  
      githubService.getRepositoryInfo.mockResolvedValueOnce({
        data: { id: 20, fullName: 'repo20', url: 'url20' },
        errors: [],
      });
      githubService.getFileContentAndSHA.mockResolvedValueOnce({
        data: null,
        errors: ['missing'],
      });
  
      deiService.getDEITemplate.mockResolvedValue('template');
      deiService.isTemplateContent.mockReturnValue(false);
      deiService.scanDEIContent.mockReturnValue({ isValid: true, missingSections: [] });
  
      const res = await request(app).post('/api/repos-to-badge').send({
        userId: user.id,
        provider: 'github',
        repos: [{ id: 10 }, { id: 20 }],
      });
  
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].success).toBe(true);
      expect(res.body.results[1].success).toBe(false);
      expect(res.body.results[1].message).toContain('does not have a DEI.md file');
    });
  
    it('should return all badged repos', async () => {
      const user = await seedUser();
  
      await Repo.create({
        githubRepoId: 123,
        DEICommitSHA: 'sha123',
        repoLink: 'url123',
        badgeType: 'Bronze',
        attachment: '',
        userId: user.id,
      });
  
      const res = await request(app).get('/api/badgedRepos');
  
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

 
});

