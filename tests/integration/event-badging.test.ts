import request from 'supertest';
import { Container } from 'typedi';
import express from 'express';
import { useExpressServer, useContainer } from 'routing-controllers';
import { setupTestDB, teardownTestDB } from '../mocks/database.mock';
import { EventBadgingController } from '../../src/event-badging/controllers/event-badging.controller';
import { GitHubApiService } from '../../src/shared/providers/github/github-api.service';
import { GitHubAppService } from '../../src/shared/providers/github/github-app.service';
import { ChecklistService, ScoringService } from '../../src/event-badging/services';
import { EventRepository } from '../../src/shared/data-access/repositories/event.repository';

import { createMockOctokit } from '../mocks/octokit.mock';
const mockGitHubApiService = {
  createIssueComment: jest.fn(),
  addLabels: jest.fn(),
  removeLabel: jest.fn(),
  closeIssue: jest.fn(),
};

const mockGitHubAppService = {
  getInstallationOctokit: jest.fn().mockResolvedValue({}),
};

const mockChecklistService = {
  getApplicantWelcome: jest.fn().mockResolvedValue('Welcome!'),
  getChecklistType: jest.fn().mockReturnValue('virtual'),
  generateReviewerChecklist: jest.fn().mockResolvedValue('- [ ] Checklist Item'),
  getReviewerWelcome: jest.fn().mockResolvedValue('Reviewer Welcome!'),
};

const mockScoringService = {
  calculateBadge: jest.fn(),
};

describe('EventBadgingController Integration', () => {
  let app: express.Express;
  let eventRepo: EventRepository;

  beforeAll(async () => {
    useContainer(Container);
    await setupTestDB();

    Container.set(GitHubApiService, mockGitHubApiService as any);
    Container.set(GitHubAppService, mockGitHubAppService as any);
    Container.set(ChecklistService, mockChecklistService as any);
    Container.set(ScoringService, mockScoringService as any);

  
    eventRepo = new EventRepository();
    Container.set(EventRepository, eventRepo);

    app = express();
    app.use(express.json());
    useExpressServer(app, { controllers: [EventBadgingController] });
    
    jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

  afterAll(async () => {
    await teardownTestDB();
    Container.reset();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGitHubAppService.getInstallationOctokit.mockResolvedValue(createMockOctokit());
  });


  it('should post a welcome message when an event issue is opened', async () => {
    const payload = {
      action: 'opened',
      issue: { title: '[Virtual Event] CHAOSS Con', number: 1 },
      installation: { id: 123 },
      repository: { name: 'badging', owner: { login: 'chaoss' } }
    };

    const res = await request(app)
      .post('/api/event_badging')
      .set('x-github-event', 'issues')
      .send(payload);

    expect(res.status).toBe(200);
    expect(mockGitHubApiService.createIssueComment).toHaveBeenCalledWith(
      expect.anything(), 'chaoss', 'badging', 1, 'Welcome!'
    );
  });

  it('should save event to DB and assign badges when issue is closed', async () => {
    mockScoringService.calculateBadge.mockResolvedValue({
      assigned_badge: 'Gold',
      badge_URL: 'gold.svg',
      reviewResult: 100,
      reviewerCount: 2
    });

    const payload = {
      action: 'closed',
      issue: { 
        title: '[In-Person Event] CHAOSS Con', 
        number: 5, 
        html_url: 'https://github.com/5',
        assignees: [{ login: 'reviewer1', html_url: 'https://github.com/reviewer1' }, { login: 'reviewer2', html_url: 'https://github.com/reviewer2' }],
        body: '- Link to the Event Website: https://chaoss.community\n- Are you an organizer'
      },
      installation: { id: 123 },
      repository: { name: 'sandbox-event-dei', owner: { login: 'adeyinkaoresanya' } }
    };

    await request(app)
      .post('/api/event_badging')
      .set('x-github-event', 'issues')
      .send(payload);

      const savedEvent = await eventRepo.findAll();
   const badge = typeof savedEvent[0].badge === 'string'
    ? JSON.parse(savedEvent[0].badge)
    : savedEvent[0].badge;

    expect(savedEvent.length).toBeGreaterThan(0);
    expect(savedEvent[0].event_name).toContain('CHAOSS Con');
    expect(badge).toEqual({ name: 'Gold', badgeURL: 'gold.svg' });;
  });

  it('should extract Event URL correctly for Virtual events with markers', async () => {
    mockScoringService.calculateBadge.mockResolvedValue({ assigned_badge: 'Silver' });
    const payload = {
      action: 'closed',
      issue: { 
        title: '[Virtual Event] Test', 
         html_url: 'https://github.com/5',
        assignees: [{ login: 'reviewer1', html_url: 'https://github.com/reviewer1' }, { login: 'reviewer2', html_url: 'https://github.com/reviewer2' }],
        body: '- Link to the Event Website: https://virtual.com\n- Provide verification that you are an event organizer: ',
      },
      installation: { id: 1 },
      repository: { name: 'b', owner: { login: 'o' } }
    };

    await request(app).post('/api/event_badging').set('x-github-event', 'issues').send(payload);

    const events = await eventRepo.findAll();
    const lastEvent = events[events.length - 1];
    expect(lastEvent.event_URL).toBe('https://virtual.com');
  });

   it('should return 500 if the internal service crashes', async () => {
      mockGitHubAppService.getInstallationOctokit.mockRejectedValue(new Error('Auth Failed'));
  
      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send({ installation: { id: 1 }, issue: { title: 'event' } });
  
      expect(res.status).toBe(500);
      expect(res.text).toBe('Error processing webhook');
    });
  
    it('should ignore webhooks that are not event-related', async () => {
      const payload = {
        action: 'opened',
        issue: { title: 'Just a bug report' },
        installation: { id: 1 }
      };
  
      const res = await request(app)
        .post('/api/event_badging')
        .set('x-github-event', 'issues')
        .send(payload);
  
      expect(res.status).toBe(200);
      expect(mockGitHubAppService.getInstallationOctokit).not.toHaveBeenCalled();
    });
});