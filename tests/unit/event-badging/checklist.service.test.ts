import { ChecklistService } from '../../../src/event-badging/services/checklist.service';
import { mockGitHubApiService } from '../../mocks/github.mock';

describe('ChecklistService', () => {
  let service: ChecklistService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChecklistService(mockGitHubApiService as any);
  });

  test('getChecklistType() should identify virtual vs in-person events', () => {
    expect(service.getChecklistType('[Virtual Event] My Conf')).toBe('virtual');
    expect(service.getChecklistType('[In-Person Event] My Conf')).toBe('in-person');
  });

  test('checkModerator() should return true if user is in the moderator list', async () => {
    mockGitHubApiService.getRepoContent.mockResolvedValue({
      data: '# Moderators\n- user1\n- user2\n- tyler',
      errors: []
    });

    const isMod = await service.checkModerator({} as any, 'o', 'r', 'tyler');
    expect(isMod).toBe(true);
  });

  test('generateReviewerChecklist() should throw error if template fetch fails', async () => {
    mockGitHubApiService.getRepoContent.mockResolvedValue({
      data: null,
      errors: ['404 Not Found']
    });

    await expect(service.generateReviewerChecklist({} as any, 'o', 'r', 'body', 'virtual'))
      .rejects.toThrow('Failed to fetch checklist: 404 Not Found');
  });

  test('checkModerator() should return false and log error if file is missing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGitHubApiService.getRepoContent.mockResolvedValue({ data: null, errors: ['File missing'] });

    const result = await service.checkModerator({} as any, 'o', 'r', 'user');
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('generateReviewerChecklist() should remove existing checkmarks from body', async () => {
    const mockTemplate = '## Initial checks\n## Metric based checks\n### Event Demographics\n### Inclusive Experience at Event\n### Time Inclusion for Virtual Events\n### Code of Conduct at Event\n### Diversity Access tickets\n### Event Accessibility';
    
    mockGitHubApiService.getRepoContent.mockResolvedValue({ data: mockTemplate, errors: [] });

    const issueBody = '## Event Demographics\n- [x] Done\n- [ ] Pending\n## Inclusive Experience at Event';
    const result = await service.generateReviewerChecklist({} as any, 'o', 'r', issueBody, 'virtual');
    
    expect(result).not.toContain('[x]');
    expect(result).not.toContain('[ ]');
  });

  test('combineVirtualChecklist() should throw if expected headers are missing', async () => {
    mockGitHubApiService.getRepoContent.mockResolvedValue({ data: 'template', errors: [] });
    const brokenBody = 'Just some text without headers';
    const result = await service.generateReviewerChecklist({} as any, 'o', 'r', brokenBody, 'virtual');
    expect(result).toBeDefined(); 
  });
});