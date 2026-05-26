import { DEIScannerService } from '../../../src/project-badging/services/dei-scanner.service';
import { DEI_REQUIRED_SECTIONS } from '../../../src/shared/types';
import { logger } from '../../../src/shared/logger';

jest.mock('axios');

import axios from 'axios';

const mockAxiosGet = axios.get as jest.Mock;

describe('DEIScannerService', () => {
  let service: DEIScannerService;

  beforeEach(() => {
    service = new DEIScannerService();
    jest.clearAllMocks();
  });

 

  test('scanDEIContent() should return isValid true when all sections are present', () => {
    const validContent = DEI_REQUIRED_SECTIONS.join('\n');
    
    const result = service.scanDEIContent(validContent);

    expect(result.isValid).toBe(true);
    expect(result.missingSections).toHaveLength(0);
  });

  test('isTemplateContent() should return true for matching content ignoring whitespace', () => {
    const template = '  # Template Content  ';
    const userContent = '# Template Content';
    
    const result = service.isTemplateContent(userContent, template);
    
    expect(result).toBe(true);
  });

  test('getDEITemplate() should fetch and decode the template from GitHub', async () => {
    const base64Template = Buffer.from('# DEI Template').toString('base64');
    mockAxiosGet.mockResolvedValueOnce({
      data: { content: base64Template }
    });

    const result = await service.getDEITemplate();

    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/badging/badging/contents/Template.DEI.md')
    );
    expect(result).toBe('# DEI Template');
  });

  test('scanDEIContent() should identify missing sections correctly', () => {
       const incompleteContent = DEI_REQUIRED_SECTIONS.slice(2).join('\n');
    
    const result = service.scanDEIContent(incompleteContent);

    expect(result.isValid).toBe(false);
    expect(result.missingSections).toContain(DEI_REQUIRED_SECTIONS[0]);
    expect(result.missingSections).toContain(DEI_REQUIRED_SECTIONS[1]);
  });

  test('getDEITemplate() should return null and log error on API failure', async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error('GitHub API Limit'));
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    const result = await service.getDEITemplate();

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('scanDEIContent() should be case-sensitive (or insensitive based on current logic)', () => {
    // Note: This current implementation uses .includes(section) which is case-sensitive.
    // If DEI_REQUIRED_SECTIONS has "Project Access" and content has "project access", it will fail.
    const lowercaseContent = DEI_REQUIRED_SECTIONS[0].toLowerCase();
    
    const result = service.scanDEIContent(lowercaseContent);
    
    expect(result.missingSections).toContain(DEI_REQUIRED_SECTIONS[0]);
  });

  test('isTemplateContent() should return false if content is slightly modified', () => {
    const template = '# Template';
    const userContent = '# Template - Updated by Me';
    
    const result = service.isTemplateContent(userContent, template);
    
    expect(result).toBe(false);
  });
});