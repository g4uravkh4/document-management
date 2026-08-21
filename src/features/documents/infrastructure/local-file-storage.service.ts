import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
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

  async readStream(key: string): Promise<Readable> {
    return createReadStream(join(this.dir, key));
  }

  async save(
    key: string,
    data: Buffer,
    _contentType: string,
  ): Promise<void> {
    mkdirSync(join(this.dir, key, '..'), { recursive: true });
    await writeFile(join(this.dir, key), data);
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
