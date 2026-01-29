import { Service } from 'typedi';
import { DEI_REQUIRED_SECTIONS, DEISection } from '../../shared/types';

export interface ILocalDEIScanResult {
  isValid: boolean;
  missingSections: DEISection[];
}

@Service()
export class DEIScannerService {
  /**
   * Scan DEI.md content for required sections
   */
  scanDEIContent(content: string): ILocalDEIScanResult {
    const missingSections: DEISection[] = [];

    for (const section of DEI_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        missingSections.push(section);
      }
    }

    return {
      isValid: missingSections.length === 0,
      missingSections,
    };
  }

  /**
   * Check if content is just a copy of the template
   */
  isTemplateContent(content: string, template: string): boolean {
    return content.trim() === template.trim();
  }

  /**
   * Get the DEI template from GitHub
   */
  async getDEITemplate(): Promise<string | null> {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get<{ content: string }>(
        'https://api.github.com/repos/badging/badging/contents/Template.DEI.md'
      );
      return Buffer.from(response.data.content, 'base64').toString();
    } catch (error) {
      console.error('Error fetching DEI template:', error);
      return null;
    }
  }
}
