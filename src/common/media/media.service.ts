import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'path';
import type { Readable } from 'stream';
import { StorageService } from '../storage/storage.service';

export type MediaKind = 'avatar' | 'logo';

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function imageFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, accept: boolean) => void,
): void {
  if (IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        'Only image files (png, jpeg, webp, gif) are allowed',
      ),
      false,
    );
  }
}

@Injectable()
export class MediaService {
  constructor(private readonly storage: StorageService) {}

  /**
  * Persists an uploaded image and returns its storage key.
   */
  async saveImage(kind: MediaKind, file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.png';
    const key = `${kind === 'avatar' ? 'avatars' : 'logos'}/${crypto.randomUUID()}${ext}`;
    await this.storage.save(key, file.buffer, file.mimetype);
    return key;
  }

  async read(key: string): Promise<{ stream: Readable; mimeType: string }> {
    const mimeType =
      MIME_BY_EXT[extname(key).toLowerCase()] ?? 'application/octet-stream';
    return { stream: await this.storage.read(key), mimeType };
  }

  async remove(key: string | null | undefined): Promise<void> {
    await this.storage.remove(key);
  }
}
