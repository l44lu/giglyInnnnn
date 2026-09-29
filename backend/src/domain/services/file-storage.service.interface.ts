export interface UploadFileInput {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  url: string;
}

export interface FileDownloadResult {
  buffer: Buffer;
  contentType: string;
}

export interface IFileStorageService {
  uploadFile(input: UploadFileInput): Promise<UploadFileResult>;
  deleteFile(keyOrUrl: string): Promise<void>;
  getFile(key: string): Promise<FileDownloadResult>;
}

export const IFileStorageService = Symbol('IFileStorageService');
