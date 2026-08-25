import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, mkdirSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly root: string;
  private readonly bucket?: string;
  private readonly client?: S3Client;

  constructor(config: ConfigService) {
    this.driver = config.get<string>('STORAGE_DRIVER', 'local');
    this.root = resolve(process.cwd(), config.get<string>('UPLOAD_DIR', 'uploads'));

    if (this.driver === 's3') {
      this.bucket = config.getOrThrow<string>('S3_BUCKET');
      this.client = new S3Client({
        region: config.get<string>('S3_REGION', 'us-east-1'),
        endpoint: config.get<string>('S3_ENDPOINT'),
        forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
        },
      });
    } else {
      mkdirSync(this.root, { recursive: true });
    }
  }

  async save(key: string, data: Buffer, contentType: string): Promise<void> {
    if (this.driver === 's3') {
      try {
        await this.client!.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: data,
            ContentType: contentType,
          }),
        );
      } catch (error) {
        this.logStorageError('upload', error);
        throw new ServiceUnavailableException(
          'File storage is temporarily unavailable. Please try again later.',
        );
      }
      return;
    }

    const filePath = join(this.root, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async read(key: string): Promise<Readable> {
    if (this.driver === 's3') {
      let result;
      try {
        result = await this.client!.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
      } catch (error) {
        this.logStorageError('download', error);
        throw new ServiceUnavailableException(
          'File storage is temporarily unavailable. Please try again later.',
        );
      }
      if (!result.Body) throw new NotFoundException('Stored file not found');
      if (result.Body instanceof Readable) return result.Body;
      return Readable.fromWeb(
        result.Body as unknown as import('stream/web').ReadableStream,
      );
    }

    return createReadStream(join(this.root, key));
  }

  async remove(key: string | null | undefined): Promise<void> {
    if (!key) return;
    if (this.driver === 's3') {
      try {
        await this.client!.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
      } catch (error) {
        this.logStorageError('delete', error);
        throw new ServiceUnavailableException(
          'File storage is temporarily unavailable. Please try again later.',
        );
      }
      return;
    }

    try {
      await unlink(join(this.root, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private logStorageError(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Unable to ${operation} file in S3 storage: ${message}`);
  }
}