import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, mkdirSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { extname, join, resolve } from 'path';
import type { Readable } from 'stream';

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
  private readonly root: string;
  private readonly avatarDir: string;
  private readonly logoDir: string;

  constructor(private readonly config: ConfigService) {
    this.root = resolve(
      process.cwd(),
      this.config.get<string>('UPLOAD_DIR', 'uploads'),
    );
    this.avatarDir = join(this.root, 'avatars');
    this.logoDir = join(this.root, 'logos');
    mkdirSync(this.avatarDir, { recursive: true });
    mkdirSync(this.logoDir, { recursive: true });
  }

  /**
   * Persists an uploaded image (memory storage) to disk and returns its key.
   * Key is relative to the upload root, e.g. `avatars/<uuid>.png`.
   */
  async saveImage(kind: MediaKind, file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.png';
    const key = `${kind === 'avatar' ? 'avatars' : 'logos'}/${crypto.randomUUID()}${ext}`;
    await writeFile(join(this.root, key), file.buffer);
    return key;
  }

  read(key: string): { stream: Readable; mimeType: string } {
    const mimeType =
      MIME_BY_EXT[extname(key).toLowerCase()] ?? 'application/octet-stream';
    return { stream: createReadStream(join(this.root, key)), mimeType };
  }

  async remove(key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await unlink(join(this.root, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
