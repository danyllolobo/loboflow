import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { APP_ENV, AppEnv } from '../config/env';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.key = env.encryptionKey;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato cifrado inválido');
    }
    const [ivHex, tagHex, dataHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
