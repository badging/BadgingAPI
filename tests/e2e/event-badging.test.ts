import 'reflect-metadata';
import request from 'supertest';
import { Container } from 'typedi';
import { useContainer } from 'routing-controllers';
import type { Express } from 'express';

import { createApp } from '../../src/app';
import { setupTestDB, teardownTestDB } from '../mocks/database.mock';
import { createMockOctokit } from '../mocks/octokit.mock';

import { Event } from '../../src/shared/data-access/models/event.model';
import { EventRepository } from '../../src/shared/data-access/repositories/event.repository';
import {
  GitHubApiService,
  GitHubAppService,
} from '../../src/shared/providers/github';
import {
  ChecklistService,
  ScoringService,
} from '../../src/event-badging/services';

describe('Event Badging E2E', () => {
  let app: Express;
  let eventRepo: EventRepository;

  const mockGitHubApiService = {
    createIssueComment: jest.fn().mockResolvedValue(undefined),
    addLabels: jest.fn().mockResolvedValue(undefined),
    removeLabel: jest.fn().mockResolvedValue(undefined),
    closeIssue: jest.fn().mockResolvedValue(undefined),
  };

  const mockGitHubAppService = {
    getInstallationOctokit: jest.fn(),
  };

  const mockChecklistService = {
    getApplicantWelcome: jest.fn().mockResolvedValue('Welcome, applicant!'),
    getChecklistType: jest.fn().mockReturnValue('virtual'),
    generateReviewerChecklist: jest
      .fn()
      .mockResolvedValue('- [ ] Review item one\n- [ ] Review item two'),
    getReviewerWelcome: jest.fn().mockResolvedValue('Welcome, reviewer!'),
  };

  const mockScoringService = {
    calculateBadge: jest.fn(),
  };

  beforeAll(async () => {
    useContainer(Container);
    await setupTestDB();

    Container.set(GitHubApiService, mockGitHubApiService as any);
    Container.set(GitHubAppService, mockGitHubAppService as any);
    Container.set(ChecklistService, mockChecklistService as any);
    Container.set(ScoringService, mockScoringService as any);

    eventRepo = new EventRepository();
    Container.set(EventRepository, eventRepo);

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDB();
    Container.reset();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGitHubAppService.getInstallationOctokit.mockResolvedValue(
      createMockOctokit()
    );
    mockChecklistService.getApplicantWelcome.mockResolvedValue(
      'Welcome, applicant!'
    );
    mockChecklistService.getChecklistType.mockReturnValue('virtual');
    mockChecklistService.generateReviewerChecklist.mockResolvedValue(
      '- [ ] Review item one\n- [ ] Review item two'
    );
    mockChecklistService.getReviewerWelcome.mockResolvedValue(
      'Welcome, reviewer!'
    );
    await Event.destroy({ where: {} });
  });

  describe('POST /api/event_badging', () => {
    it('returns 400 when the x-github-event header is missing', async () => {
      const res = await request(app)
        .post('/api/event_badging')
        .send({
          action: 'opened',
          issue: { title: '[Virtual Event] Some Conf', number: 1 },
          installation: { id: 1 },
          repository: { name: 'badging', owner: { login: 'chaoss' } },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('GitHub event header missing');
    });

    it('posts an applicant welcome comment when an event issue is opened', async () => {
      const payload = {
        action: 'opened',
        issue: { title: '[Virtual Event] CHAOSS Con 2026', number: 1 },
        installation: { id: 123 },
        repository: { name: 'badging', owner: { login: 'chaoss' } },
      };

      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
      expect(mockGitHubAppService.getInstallationOctokit).toHaveBeenCalledWith(
        123
      );
      expect(mockGitHubApiService.createIssueComment).toHaveBeenCalledWith(
        expect.anything(),
        'chaoss',
        'badging',
        1,
        'Welcome, applicant!'
      );
    });

    it('ignores non-event-related issue webhooks (e.g. plain bug reports)', async () => {
      const payload = {
        action: 'opened',
        issue: { title: 'Just a bug report', number: 2 },
        installation: { id: 1 },
        repository: { name: 'badging', owner: { login: 'chaoss' } },
      };

      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
      expect(mockGitHubAppService.getInstallationOctokit).not.toHaveBeenCalled();
      expect(mockGitHubApiService.createIssueComment).not.toHaveBeenCalled();
    });

    it('persists a Gold-badged event when the issue is closed and scoring succeeds', async () => {
      mockScoringService.calculateBadge.mockResolvedValue({
        assigned_badge: 'Gold',
        badge_URL: 'https://badges.example.com/gold.svg',
        reviewResult: 100,
        reviewerCount: 2,
      });

      const payload = {
        action: 'closed',
        issue: {
          title: '[In-Person Event] CHAOSS Con 2026',
          number: 5,
          html_url: 'https://github.com/chaoss/badging/issues/5',
          assignees: [
            {
              login: 'reviewer1',
              html_url: 'https://github.com/reviewer1',
            },
            {
              login: 'reviewer2',
              html_url: 'https://github.com/reviewer2',
            },
          ],
          body: '- Link to the Event Website: https://chaoss.community\n- Are you an organizer',
        },
        installation: { id: 123 },
        repository: {
          name: 'sandbox-event-dei',
          owner: { login: 'adeyinkaoresanya' },
        },
      };

      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');

      const saved = await eventRepo.findAll();
      expect(saved.length).toBeGreaterThan(0);

      const event = saved[saved.length - 1];
      expect(event.event_name).toContain('CHAOSS Con');

      const badge =
        typeof event.badge === 'string'
          ? JSON.parse(event.badge as unknown as string)
          : event.badge;
      expect(badge).toEqual({
        name: 'Gold',
        badgeURL: 'https://badges.example.com/gold.svg',
      });
    });

    it('extracts the Event URL correctly for Virtual events from the issue body', async () => {
      mockScoringService.calculateBadge.mockResolvedValue({
        assigned_badge: 'Silver',
        badge_URL: 'https://badges.example.com/silver.svg',
        reviewResult: 75,
        reviewerCount: 2,
      });

      const payload = {
        action: 'closed',
        issue: {
          title: '[Virtual Event] Remote Summit',
          number: 7,
          html_url: 'https://github.com/chaoss/badging/issues/7',
          assignees: [
            {
              login: 'reviewer1',
              html_url: 'https://github.com/reviewer1',
            },
            {
              login: 'reviewer2',
              html_url: 'https://github.com/reviewer2',
            },
          ],
          body:
            '- Link to the Event Website: https://virtual.example.com\n' +
            '- Provide verification that you are an event organizer: ',
        },
        installation: { id: 1 },
        repository: { name: 'badging', owner: { login: 'chaoss' } },
      };

      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);

      expect(res.status).toBe(200);

      const events = await eventRepo.findAll();
      const last = events[events.length - 1];
      expect(last.event_URL).toBe('https://virtual.example.com');
    });

    it('returns 500 when an internal dependency throws (e.g. GitHub auth failure)', async () => {
      mockGitHubAppService.getInstallationOctokit.mockRejectedValue(
        new Error('Auth Failed')
      );

      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send({
          action: 'opened',
          issue: { title: '[Virtual Event] Crashy', number: 9 },
          installation: { id: 1 },
          repository: { name: 'badging', owner: { login: 'chaoss' } },
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error');
    });
  });

  describe('GET /api/badged_events', () => {
    it('returns an empty array when no events have been badged', async () => {
      const res = await request(app).get('/api/badged_events');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('returns badged events end-to-end after a closed-issue webhook is processed', async () => {
      mockScoringService.calculateBadge.mockResolvedValue({
        assigned_badge: 'Gold',
        badge_URL: 'https://badges.example.com/gold.svg',
        reviewResult: 100,
        reviewerCount: 2,
      });

      const payload = {
        action: 'closed',
        issue: {
          title: '[In-Person Event] DevFest 2026',
          number: 11,
          html_url: 'https://github.com/chaoss/badging/issues/11',
          assignees: [
            {
              login: 'reviewer1',
              html_url: 'https://github.com/reviewer1',
            },
            {
              login: 'reviewer2',
              html_url: 'https://github.com/reviewer2',
            },
          ],
          body: '- Link to the Event Website: https://devfest.example.com\n- Are you an organizer',
        },
        installation: { id: 42 },
        repository: { name: 'badging', owner: { login: 'chaoss' } },
      };

      await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);

      const res = await request(app).get('/api/badged_events');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.some((e: any) => String(e.event_name).includes('DevFest'))
      ).toBe(true);
    });
  });
});
