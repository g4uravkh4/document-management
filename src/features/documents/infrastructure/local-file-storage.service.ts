import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, resolve } from 'path';
import type { Readable } from 'stream';
import { FileStorage } from '../domain/ports';

@Injectable()
export class LocalFileStorage implements FileStorage {
  private readonly dir: string;

  constructor(private readonly config: ConfigService) {
    this.dir = resolve(
      process.cwd(),
      this.config.get<string>('UPLOAD_DIR', 'uploads'),
    );
    mkdirSync(this.dir, { recursive: true });
  }

  readStream(key: string): Readable {
    return createReadStream(join(this.dir, key));
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(join(this.dir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
