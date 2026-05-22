import { Service } from 'typedi';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import TurndownService from 'turndown';
import { getEnvVar } from '../config/environment';

@Service()
export class CryptoService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey: string;
  private readonly turndownService: TurndownService;

  constructor() {
    const encryptionKey = getEnvVar('ENCRYPTION_SECRET_KEY', false);
    
    this.secretKey = crypto
      .createHash('sha256')
      .update(String(encryptionKey))
      .digest('base64')
      .slice(0, 32);

    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
    });
  }

  /**
   * Encrypt text using AES-256-CTR with compression
   */
  encrypt(text: string): string {
    const compressed = zlib.deflateSync(text);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    return `${iv.toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  /**
   * Decrypt text encrypted with encrypt()
   */
  decrypt(hash: string): string {
    const [iv, content] = hash.split(':');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(iv, 'base64url')
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(content, 'base64url')),
      decipher.final(),
    ]);
    return zlib.inflateSync(decrypted).toString();
  }

  /**
   * Convert HTML to Markdown
   */
  convertToMarkdown(html: string): string {
    return this.turndownService.turndown(html);
  }
}
