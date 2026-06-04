import api from './api';
import type { ApiResponse } from '../types/api';

export type StorageFolder = 'receipts' | 'vehicles' | 'profiles';

export interface UploadImageResult {
  url: string;
  path: string;
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
  return body.data;
}
