import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  IFileStorageService,
  UploadFileInput,
  UploadFileResult,
  FileDownloadResult,
} from '../../domain/services/file-storage.service.interface';

export interface S3ClientLike {
  send: (command: any) => Promise<any>;
}

@Injectable()
export class S3FileStorageService implements IFileStorageService {
  private readonly logger = new Logger(S3FileStorageService.name);
  private readonly s3Client: S3ClientLike;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl?: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() s3Client?: S3ClientLike,
  ) {
    this.region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? '';
    this.cloudfrontUrl = this.configService.get<string>('AWS_CLOUDFRONT_URL');

    if (s3Client) {
      this.s3Client = s3Client;
    } else {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

      const clientConfig: S3ClientConfig = {
        region: this.region,
      };

      if (endpoint) {
        clientConfig.endpoint = endpoint;
        clientConfig.forcePathStyle = true;
      }

      if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId,
          secretAccessKey,
        };
      }

      this.s3Client = new S3Client(clientConfig);
    }
  }

  async uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
    const { key, buffer, contentType } = input;

    if (!this.bucket) {
      this.logger.error(
        'S3 upload attempted but AWS_S3_BUCKET is not configured',
      );
      throw new Error('S3 storage bucket is not configured');
    }

    if (!key || key.trim() === '') {
      throw new Error('File storage key must not be empty');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File successfully uploaded with key: ${key}`);

      const url = this.cloudfrontUrl
        ? `${this.cloudfrontUrl.replace(/\/$/, '')}/${key}`
        : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        key,
        url,
      };
    } catch (error) {
      const errMessage = (error as Error).message ?? 'Unknown S3 error';
      this.logger.error(
        `Failed to upload file to S3 with key "${key}": ${errMessage}`,
      );
      throw new Error(`Failed to upload file: ${errMessage}`);
    }
  }

  async deleteFile(keyOrUrl: string): Promise<void> {
    if (!this.bucket) {
      this.logger.error(
        'S3 delete attempted but AWS_S3_BUCKET is not configured',
      );
      throw new Error('S3 storage bucket is not configured');
    }

    const key = this.extractKey(keyOrUrl);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File successfully deleted with key: ${key}`);
    } catch (error) {
      const errMessage = (error as Error).message ?? 'Unknown S3 error';
      this.logger.error(
        `Failed to delete file from S3 with key "${key}": ${errMessage}`,
      );
      throw new Error(`Failed to delete file: ${errMessage}`);
    }
  }

  async getFile(keyOrUrl: string): Promise<FileDownloadResult> {
    if (!this.bucket) {
      this.logger.error(
        'S3 getFile attempted but AWS_S3_BUCKET is not configured',
      );
      throw new Error('S3 storage bucket is not configured');
    }

    const key = this.extractKey(keyOrUrl);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new Error(`Empty body returned from S3 for key "${key}"`);
      }

      let buffer: Buffer;
      if (typeof response.Body.transformToByteArray === 'function') {
        const byteArray = await response.Body.transformToByteArray();
        buffer = Buffer.from(byteArray);
      } else if (Buffer.isBuffer(response.Body)) {
        buffer = response.Body;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }

      const contentType = response.ContentType || 'application/octet-stream';

      this.logger.log(`File successfully retrieved with key: ${key}`);

      return {
        buffer,
        contentType,
      };
    } catch (error) {
      const errMessage = (error as Error).message ?? 'Unknown S3 error';
      this.logger.error(
        `Failed to get file from S3 with key "${key}": ${errMessage}`,
      );
      throw new Error(`Failed to get file: ${errMessage}`);
    }
  }

  private extractKey(keyOrUrl: string): string {
    if (!keyOrUrl || keyOrUrl.trim() === '') {
      throw new Error('Storage key or URL must not be empty');
    }

    const trimmed = keyOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        return parsed.pathname.replace(/^\//, '');
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }
}
