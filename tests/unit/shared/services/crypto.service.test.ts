import 'reflect-metadata';
import { CryptoService } from '../../../../src/shared/services/crypto.service';
import * as envConfig from '../../../../src/shared/config/environment';

describe('CryptoService', () => {
  let service: CryptoService;
  const mockSecret = 'super-secret-key-123';

  beforeEach(() => {
    // Mock the environment variable before the service constructor runs
    jest.spyOn(envConfig, 'getEnvVar').mockReturnValue(mockSecret);
    service = new CryptoService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should encrypt and decrypt a string back to its original value', () => {
    const originalText = 'Hello, CHAOSS! This is a secret message.';
    
    const encrypted = service.encrypt(originalText);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted).not.toBe(originalText);
    expect(encrypted).toContain(':');
    expect(decrypted).toBe(originalText);
  });

  test('should produce different ciphertexts for the same input (using random IV)', () => {
    const text = 'Same message';
    
    const encrypted1 = service.encrypt(text);
    const encrypted2 = service.encrypt(text);

    expect(encrypted1).not.toBe(encrypted2);
  });


  test('convertToMarkdown() should convert HTML tags to Markdown', () => {
    const html = '<h1>Title</h1><p>Body with <strong>bold</strong> text.</p>';
    const expected = '# Title\n\nBody with **bold** text.';
    
    const result = service.convertToMarkdown(html);
    expect(result.trim()).toBe(expected);
    expect(result).toContain('# Title');
    expect(result).toContain('**bold**');
  });


  test('decrypt() should throw an error if the hash is malformed', () => {
    const malformedHash = 'not-a-valid-hash';

    expect(() => service.decrypt(malformedHash)).toThrow();
  });

  test('should handle very large strings (testing compression/decompression)', () => {
    const largeText = 'A'.repeat(10000);
    
    const encrypted = service.encrypt(largeText);
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe(largeText);
    expect(decrypted.length).toBe(10000);
  });

  test('should handle empty strings', () => {
    const empty = '';
    const encrypted = service.encrypt(empty);
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe(empty);
  });
});