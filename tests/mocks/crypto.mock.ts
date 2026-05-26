export const createMockCryptoService = () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  convertToMarkdown: jest.fn(),
});