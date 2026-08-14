import api from './api';
import type { ApiResponse } from '../types/api';

export type StorageFolder = 'receipts' | 'vehicles' | 'profiles' | 'companies';

export interface UploadImageResult {
  /** Canonical URL to store in MongoDB */
  url: string;
  path: string;
  /** Browser-ready URL (presigned when S3 bucket is private) */
  viewUrl: string;
}

export async function uploadImage(
  file: File,
  folder: StorageFolder,
): Promise<UploadImageResult> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<UploadImageResult>>(
    `/storage/upload?folder=${folder}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  const body = response.data;
  if (!body.success || !body.data?.url) {
    throw new Error(body.message || 'Image upload failed');
  }
  return {
    ...body.data,
    viewUrl: body.data.viewUrl || body.data.url,
  };
}
