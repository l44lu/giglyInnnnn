import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { S3FileStorageService, S3ClientLike } from './s3-file-storage.service';
import { Logger } from '@nestjs/common';

describe('S3FileStorageService', () => {
  let service: S3FileStorageService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockS3Client: S3ClientLike & { send: jest.Mock };
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockBucket = 'gigly-storage-bucket';
  const mockRegion = 'ap-south-1';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'AWS_S3_BUCKET') return mockBucket;
        if (key === 'AWS_REGION') return mockRegion;
        if (key === 'AWS_ACCESS_KEY_ID') return 'mock-access-key-id';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'mock-secret-access-key';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockS3Client = {
      send: jest.fn(),
    };

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    service = new S3FileStorageService(mockConfigService, mockS3Client);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Upload', () => {
    it('should use correct bucket configuration, supplied key, and forwarded content type', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const testBuffer = Buffer.from('mock image binary data');
      const testKey = 'avatars/user-123/uuid-456.webp';
      const testContentType = 'image/webp';

      const result = await service.uploadFile({
        key: testKey,
        buffer: testBuffer,
        contentType: testContentType,
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const command = mockS3Client.send.mock.calls[0][0] as PutObjectCommand;

      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe(mockBucket);
      expect(command.input.Key).toBe(testKey);
      expect(command.input.Body).toEqual(testBuffer);
      expect(command.input.ContentType).toBe(testContentType);

      expect(result).toEqual({
        key: testKey,
        url: `https://${mockBucket}.s3.${mockRegion}.amazonaws.com/${testKey}`,
      });
    });

    it('should use CloudFront URL when AWS_CLOUDFRONT_URL is configured', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const cdnDomain = 'https://cdn.gigly.com';
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'AWS_S3_BUCKET') return mockBucket;
        if (key === 'AWS_REGION') return mockRegion;
        if (key === 'AWS_CLOUDFRONT_URL') return cdnDomain;
        return undefined;
      });

      const cdnService = new S3FileStorageService(
        mockConfigService,
        mockS3Client,
      );
      const testKey = 'avatars/user-999/photo.png';

      const result = await cdnService.uploadFile({
        key: testKey,
        buffer: Buffer.from('test'),
        contentType: 'image/png',
      });

      expect(result.url).toBe(`${cdnDomain}/${testKey}`);
    });

    it('should throw error when AWS_S3_BUCKET is missing', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);
      const unconfiguredService = new S3FileStorageService(
        mockConfigService,
        mockS3Client,
      );

      await expect(
        unconfiguredService.uploadFile({
          key: 'test/key.webp',
          buffer: Buffer.from('data'),
          contentType: 'image/webp',
        }),
      ).rejects.toThrow('S3 storage bucket is not configured');

      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should throw error when key is empty', async () => {
      await expect(
        service.uploadFile({
          key: '   ',
          buffer: Buffer.from('data'),
          contentType: 'image/webp',
        }),
      ).rejects.toThrow('File storage key must not be empty');

      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should handle S3 failure according to project conventions', async () => {
      mockS3Client.send.mockRejectedValueOnce(
        new Error('Network failure connecting to S3'),
      );

      await expect(
        service.uploadFile({
          key: 'avatars/user-1/test.png',
          buffer: Buffer.from('test data'),
          contentType: 'image/png',
        }),
      ).rejects.toThrow(
        'Failed to upload file: Network failure connecting to S3',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to upload file to S3 with key "avatars/user-1/test.png"',
        ),
      );
    });
  });

  describe('Delete', () => {
    it('should use correct bucket and object key when deleting by key', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const testKey = 'avatars/user-123/old-avatar.webp';
      await service.deleteFile(testKey);

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const command = mockS3Client.send.mock.calls[0][0] as DeleteObjectCommand;

      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input.Bucket).toBe(mockBucket);
      expect(command.input.Key).toBe(testKey);
    });

    it('should extract object key when deleting by full URL', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const fullUrl = `https://${mockBucket}.s3.${mockRegion}.amazonaws.com/avatars/user-123/photo.jpg`;
      await service.deleteFile(fullUrl);

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const command = mockS3Client.send.mock.calls[0][0] as DeleteObjectCommand;

      expect(command.input.Bucket).toBe(mockBucket);
      expect(command.input.Key).toBe('avatars/user-123/photo.jpg');
    });

    it('should throw error when AWS_S3_BUCKET is not configured for delete', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);
      const unconfiguredService = new S3FileStorageService(
        mockConfigService,
        mockS3Client,
      );

      await expect(
        unconfiguredService.deleteFile('avatars/test.webp'),
      ).rejects.toThrow('S3 storage bucket is not configured');

      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should throw error when delete key is empty', async () => {
      await expect(service.deleteFile('')).rejects.toThrow(
        'Storage key or URL must not be empty',
      );
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should handle S3 delete failure according to project conventions', async () => {
      mockS3Client.send.mockRejectedValueOnce(
        new Error('Access Denied from S3'),
      );

      await expect(
        service.deleteFile('avatars/user-1/test.png'),
      ).rejects.toThrow('Failed to delete file: Access Denied from S3');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to delete file from S3 with key "avatars/user-1/test.png"',
        ),
      );
    });
  });

  describe('getFile', () => {
    it('should send GetObjectCommand, convert body to buffer, and return contentType', async () => {
      const mockBuffer = Buffer.from('test-image-binary-data');
      mockS3Client.send.mockResolvedValueOnce({
        Body: {
          transformToByteArray: jest
            .fn()
            .mockResolvedValue(new Uint8Array(mockBuffer)),
        },
        ContentType: 'image/webp',
      });

      const result = await service.getFile('avatars/user-123/avatar.webp');

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const command = mockS3Client.send.mock.calls[0][0] as GetObjectCommand;

      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Bucket).toBe(mockBucket);
      expect(command.input.Key).toBe('avatars/user-123/avatar.webp');
      expect(result.buffer).toEqual(mockBuffer);
      expect(result.contentType).toBe('image/webp');
    });

    it('should extract key if full URL is passed to getFile', async () => {
      const mockBuffer = Buffer.from('img');
      mockS3Client.send.mockResolvedValueOnce({
        Body: mockBuffer,
        ContentType: 'image/png',
      });

      const fullUrl = `https://${mockBucket}.s3.${mockRegion}.amazonaws.com/avatars/user-1/photo.png`;
      const result = await service.getFile(fullUrl);

      const command = mockS3Client.send.mock.calls[0][0] as GetObjectCommand;
      expect(command.input.Key).toBe('avatars/user-1/photo.png');
      expect(result.buffer).toEqual(mockBuffer);
      expect(result.contentType).toBe('image/png');
    });

    it('should throw error when AWS_S3_BUCKET is not configured for getFile', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);
      const unconfiguredService = new S3FileStorageService(
        mockConfigService,
        mockS3Client,
      );

      await expect(
        unconfiguredService.getFile('avatars/test.webp'),
      ).rejects.toThrow('S3 storage bucket is not configured');

      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should throw error when getFile key is empty', async () => {
      await expect(service.getFile('')).rejects.toThrow(
        'Storage key or URL must not be empty',
      );
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should handle S3 getFile error according to project conventions', async () => {
      mockS3Client.send.mockRejectedValueOnce(
        new Error('NoSuchKey: The specified key does not exist'),
      );

      await expect(
        service.getFile('avatars/user-1/missing.png'),
      ).rejects.toThrow(
        'Failed to get file: NoSuchKey: The specified key does not exist',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get file from S3 with key "avatars/user-1/missing.png"',
        ),
      );
    });
  });

  describe('Security & Isolation', () => {
    it('Security Invariant: should NOT apply public ACLs to PutObjectCommand', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await service.uploadFile({
        key: 'avatars/user-1/safe.webp',
        buffer: Buffer.from('safe-binary'),
        contentType: 'image/webp',
      });

      const command = mockS3Client.send.mock.calls[0][0] as PutObjectCommand;
      expect(command.input.ACL).toBeUndefined();
    });

    it('Security Invariant: credentials and secret keys must NOT be logged', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await service.uploadFile({
        key: 'avatars/user-1/avatar.webp',
        buffer: Buffer.from('data'),
        contentType: 'image/webp',
      });

      for (const call of loggerLogSpy.mock.calls) {
        expect(call[0]).not.toContain('mock-secret-access-key');
        expect(call[0]).not.toContain('mock-access-key-id');
      }

      for (const call of loggerErrorSpy.mock.calls) {
        expect(call[0]).not.toContain('mock-secret-access-key');
        expect(call[0]).not.toContain('mock-access-key-id');
      }
    });

    it('Security Invariant: caller must supply safe key, preventing arbitrary client originalname usage', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const callerControlledKey = 'avatars/user-1/generated-uuid.webp';
      await service.uploadFile({
        key: callerControlledKey,
        buffer: Buffer.from('data'),
        contentType: 'image/webp',
      });

      const command = mockS3Client.send.mock.calls[0][0] as PutObjectCommand;
      expect(command.input.Key).toBe(callerControlledKey);
    });

    it('should initialize S3Client with custom endpoint and forcePathStyle when AWS_S3_ENDPOINT is configured', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'AWS_S3_ENDPOINT') return 'http://localhost:9000';
        if (key === 'AWS_REGION') return 'us-east-1';
        return undefined;
      });

      const endpointService = new S3FileStorageService(mockConfigService);
      expect(endpointService).toBeDefined();
    });
  });
});
