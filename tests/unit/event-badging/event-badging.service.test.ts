import { EventBadgingService } from '../../../src/event-badging/services/event-badging.service';
import { GitHubApiService } from '../../../src/shared/providers/github/github-api.service';
import { GitHubAppService } from '../../../src/shared/providers/github/github-app.service';
import { EventRepository } from '../../../src/shared/data-access/repositories/event.repository';
import { ChecklistService } from '../../../src/event-badging/services/checklist.service';
import { ScoringService } from '../../../src/event-badging/services/scoring.service';
import { IGitHubWebhookPayload } from '../../../src/shared/types';
import { createMockOctokit } from '../../mocks/octokit.mock';

describe('EventBadgingService', () => {
  let service: EventBadgingService;
  let githubApiService: jest.Mocked<GitHubApiService>;
  let githubAppService: jest.Mocked<GitHubAppService>;
  let eventRepository: jest.Mocked<EventRepository>;
  let checklistService: jest.Mocked<ChecklistService>;
  let scoringService: jest.Mocked<ScoringService>;
  let mockOctokit: ReturnType<typeof createMockOctokit>;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => {});

    
    mockOctokit = createMockOctokit();

    githubApiService = {
      createIssueComment: jest.fn(),
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
      closeIssue: jest.fn(),
    } as any;

    githubAppService = {
      getInstallationOctokit: jest.fn().mockResolvedValue(mockOctokit),
    } as any;

    eventRepository = {
      createEvent: jest.fn(),
    } as any;

    checklistService = {
      getApplicantWelcome: jest.fn(),
      getChecklistType: jest.fn(),
      generateReviewerChecklist: jest.fn(),
      getReviewerWelcome: jest.fn(),
    } as any;

    scoringService = {
      calculateBadge: jest.fn(),
    } as any;

    service = new EventBadgingService(
      githubApiService,
      githubAppService,
      eventRepository,
      checklistService,
      scoringService
    );
  });

  const createPayload = (title: string, action: string): IGitHubWebhookPayload => ({
    action,
    installation: { id: 123 },
    repository: { name: 'sandbox-event-dei', owner: { login: 'owner' } },
    issue: {
      number: 1,
      title,
      body: "# Virtual Event Submission ## Requirements - Event Name: teststs - Link to the Event Website: https://event.com - Provide verification that you are an event organizer: Yes ## Event Demographics - \[ \] This event commits to Event Diversity and Inclusion. - `Q` Detail the process for measuring Event Demographics. - `A` - `Q` Provide an example of an opt-out option on the Event registration page if available. - `A` - `Q` Provide an example of a demographics text input box on the Event registration page if available. - `A` ## Inclusive Experience at Event - \[ \] This event commits to the Code of Conduct at Event. - `Q` Provide an example of the Event Feedback page if available. - `A` - `Q` Is the event team using feedback from previous event's attendees, speakers, and volunteers to improve DEI at this event? - `A` - `Q` Does the event team plan to use feedback from this event's attendees, speakers, and volunteers to improve DEI at future events? - `A` - `Q` How can attendees learn more about accessibility at the event? - `A` - `Q` Does the event platform allow attendees to suggest future accomodations for the event? - `A` - `Q` Will the event platform be accessible to attendees and speakers after the event? - `A` ## Time Inclusion for Virtual Events - \[ \] This event commits to Time Inclusion for Virtual Events. - `Q` Are speakers able to pre-record their presentations, as opposed to presenting them live? - `A` null - `Q` Can attendees change video quality on the Event platform while viewing a presentation? - `A` null ## Code of Conduct at Event - \[ \] This event commits to the Code of Conduct at Event. - `Q` Is the code of conduct posted at Event venue? - `A` null - `Q` Provide a link for the Event Code of Conduct. - `A` ## Diversity Access Tickets - \[ \] This event commits to the Diversity Access Tickets. - `Q` How many different types of diversity access tickets are available for the event? - `A` - `Q` What are the criteria for qualifying for a diversity access ticket? - `A` - `Q` Provide a link to the page containing information about Diversity Access Tickets. - `A` ## Event Accessibility - \[ \] This event commits to Event Accessibility. - `Q` Closed captioning is provided for this event. - `A` - `Q` Other accommodations are provided, or will be provided upon request. - `A` - `Q` Provide a link to the page containing information about Event Accessibility. - `A`",
      html_url: 'https://github.com/owner/sandbox-event-dei/issues/1',
      assignees: [],
    }
  } as any);

  test('should post welcome message when an event issue is opened', async () => {
    const payload = createPayload('[Virtual Event] test', 'opened');
    checklistService.getApplicantWelcome.mockResolvedValue('Thanks for applying to CHAOSS Badging');

    await service.processWebhook('issues', payload);

    expect(githubAppService.getInstallationOctokit).toHaveBeenCalledWith(123);

    expect(githubApiService.createIssueComment).toHaveBeenCalledWith(
      mockOctokit,
      'owner',
      'sandbox-event-dei',
      1,
      'Thanks for applying to CHAOSS Badging'
    );
  });

  test('should post checklist and add label when second reviewer is assigned', async () => {
    const payload = createPayload('[Virtual Event] test', 'assigned');
    payload.issue!.assignees = [
      { login: 'reviewer1' },
      { login: 'reviewer2' }
    ] as any;

    payload.assignee = { login: 'reviewer2' } as any;

    checklistService.getChecklistType.mockReturnValue('virtual' as any);
    checklistService
    .generateReviewerChecklist
    .mockResolvedValue(`## Time Inclusion for Virtual Events
    - [ ] Task 1
    - [ ] Task 2
    `);
    checklistService.getReviewerWelcome.mockResolvedValue('Thank you for becoming a part of this Event Badging review.');

    await service.processWebhook('issues', payload);

    expect(githubApiService.createIssueComment).toHaveBeenCalledWith(
      mockOctokit,
      'owner',
      'sandbox-event-dei',
      1,
      expect.stringContaining('## Time Inclusion for Virtual Events')
    );

    expect(githubApiService.addLabels).toHaveBeenCalledWith(
      mockOctokit,
      'owner',
      'sandbox-event-dei',
      1,
      ['review-begin']
    );
  });

  test('should calculate score and save to DB when issue is closed', async () => {
     const payload = createPayload('[In-Person Event] Global Conf', 'closed');

 payload.issue!.body = "# In-Person Event Submission ## Requirements - Event Name: test2 - Link to the Event Website: https://event.com - Are you an organizer of this event? null ## Event Demographics - \[ \] This event commits to Event Diversity and Inclusion. - `Q` Detail the process for measuring Event Demographics. - `A` - `Q` Provide an example of an opt-out option on the Event registration page if available. - `A` - `Q` Provide an example of a demographics text input box on the Event registration page if available. - `A` ## Inclusive Experience at Event - \[ \] This event commits to the Code of Conduct at Event. - `Q` Provide an example of the Event Feedback page if available. - `A` - `Q` Is the event team using feedback from previous event's attendees, speakers, and volunteers to improve DEI at this event? - `A` - `Q` Does the event team plan to use feedback from this event's attendees, speakers, and volunteers to improve DEI at future events? - `A` - `Q` How can attendees learn more about accessibility at the event? - `A` - `Q` Does the event platform allow attendees to suggest future accomodations for the event? - `A` - `Q` Will the event platform be accessible to attendees and speakers after the event? - `A` ## Code of Conduct at Event - \[ \] This event commits to the Code of Conduct at Event. - `Q` Is the code of conduct posted at Event venue? - `A` null - `Q` Provide a link for the Event Code of Conduct. - `A` ## Diversity Access Tickets - \[ \] This event commits to the Diversity Access Tickets. - `Q` How many different types of diversity access tickets are available for the event? - `A` - `Q` What are the criteria for qualifying for a diversity access ticket? - `A` - `Q` Provide a link to the page containing information about Diversity Access Tickets. - `A` ## Family Friendliness - \[ \] This event commits to Family Friendliness. - `Q` Does the Event provide childcare facilities for its attendees and speakers? - `A` - `Q` What are the other ways that a family-friendly environment is being created in the Event? - `A` - `Q` Provide relevant links related to family friendliness at the Event. - `A` ## Event Accessibility - \[ \] This event commits to Event Accessibility. - `Q` Is the Event in a wheelchair-accessible venue? - `A` - `Q` Are speakers given guidance about creating slides that are colorblind accessible? - `A` - `Q` Is signage at the event and the event website colorblind accessible? - `A` - `Q` Does the Event provide other accessibility accommodations, or will upon request? - `A` - `Q` Provide relevant links related to event accessibility at the Event. - `A` ## Event Location Inclusivity - \[ \] This event commits to Event Location Inclusivity. - `Q` Has the Event's location been checked against lists of places of concern for the following demographics: sexual and gender minorities, people with disabilities, racial and ethnic minorities, women, or religious minorities? - `A` - `Q` Have the Event's dates been checked for other events happening in the same location at the same time that could potentially bring harm to a subset of any attendees? - `A` - `Q` The Event website addresses or acknowledges any cause for concern for marginalized attendees. - `A` ## Public Health and Safety - \[ \] This event commits to Public Health and Safety. - `Q` Have you participated in the Public Health Pledge Badging Program? - `A` null - `Q` Provide a link to the PHPledge Badges received. - `A` undefined - `Q` Provide a link to publicly available information about public health and safety on the event website. - `A`",

  payload.issue!.assignees = [
    { login: 'reviewer1', id: 1, html_url: 'https://github.com/reviewer1', type: 'User' },
    { login: 'reviewer2', id: 2, html_url: 'https://github.com/reviewer2', type: 'User' }
  ] as any;
    
    scoringService.calculateBadge.mockResolvedValue({
      markdownBadgeImage: '![Badge](badge-url)',
      htmlBadgeImage: '<img src="badge-url" alt="Badge"/>',
      reviewResult: 90,
      reviewerCount: 2,
      assigned_badge: 'Gold',
      badge_URL: 'gold-url',
    } as any);

    await service.processWebhook('issues', payload);

    expect(eventRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'Global Conf',
        event_URL: 'https://event.com',
        badge: { name: 'Gold', badgeURL: 'gold-url' },
        reviewers: [
          { name: 'reviewer1', github_profile_link: 'https://github.com/reviewer1' },
          { name: 'reviewer2', github_profile_link: 'https://github.com/reviewer2' }
        ],
        application: { app_no: 1, app_URL: 'https://github.com/owner/sandbox-event-dei/issues/1' }
      })
    );
  });

  test('should ignore non-event issues', async () => {
    const payload = createPayload('General Bug Report', 'opened');
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    await service.processWebhook('issues', payload);

    expect(githubAppService.getInstallationOctokit).not.toHaveBeenCalled();
    expect(githubApiService.createIssueComment).not.toHaveBeenCalled();

    infoSpy.mockRestore();
  });

  test('should handle and log errors during comment creation', async () => {
    const payload = createPayload('[Event]', 'opened');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    githubApiService.createIssueComment.mockRejectedValue(new Error('GitHub Down'));

    await service.processWebhook('issues', payload);
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith(
      'Error posting welcome message:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  test('should process /result command from a comment', async () => {
    const payload = createPayload('[Virtual Event]', 'created');
    payload.comment = { body: '/result' } as any;

    scoringService.calculateBadge.mockResolvedValue({
      reviewResult: 85,
      reviewerCount: 2
    } as any);

    await service.processWebhook('issue_comment', payload);

    expect(githubApiService.createIssueComment).toHaveBeenCalledWith(
      mockOctokit,
      'owner',
      'sandbox-event-dei',
      1,
      expect.stringContaining('85')
    );
  });

  test('should parse Event URL correctly for Virtual Events', async () => {
    const payload = createPayload('[Virtual Event] Online Meetup', 'closed');

    payload.issue!.body =
      '- Link to the Event Website: https://virtual.io - Provide verification that you are an event organizer: Yes';

    scoringService.calculateBadge.mockResolvedValue({
      assigned_badge: 'Silver'
    } as any);

    await service.processWebhook('issues', payload);

    expect(eventRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_URL: 'https://virtual.io'
      })
    );
  });
});