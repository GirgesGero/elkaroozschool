import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { phpApi } from '@/lib/api/php';
import type { StorageUploadResponse, MediaAsset } from '@/types/storage';

const BASE = 'https://php.example.test';

function respondWith(payload: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_PHP_API_URL = BASE;
  fetchMock = respondWith({
    status: 'success',
    message: 'تم رفع الملف بنجاح',
    data: {
      asset_id: '550e8400-e29b-41d4-a716-446655440000',
      filename: 'sample.pdf',
      file_url: 'https://php.example.test/storage/file/550e8400-e29b-41d4-a716-446655440000',
      file_size: 102400,
      mime_type: 'application/pdf',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      resource_type: 'CURRICULUM',
      group_id: 1,
    },
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_PHP_API_URL;
});

describe('Storage & Media Asset API', () => {
  it('sends multipart form data to storage upload endpoint', async () => {
    const formData = new FormData();
    formData.append('folder_type', 'curriculum');
    formData.append('group_id', '1');

    const result = await phpApi<StorageUploadResponse['data']>('/storage/upload', {
      method: 'POST',
      formData,
      session: {
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1790000000,
        refresh_token: 'refresh',
        user: { id: 'u-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(`${BASE}/storage/upload`);
    expect(calledInit.method).toBe('POST');
    expect(calledInit.headers.Authorization).toBe('Bearer fake-jwt-token');
    expect(result?.asset_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result?.file_url).toContain('/storage/file/');
  });

  it('correctly types media asset structure', () => {
    const asset: MediaAsset = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      resource_type: 'BOOK_FILE',
      resource_id: 'book-123',
      storage_provider: 'GOOGLE_DRIVE',
      file_name: 'theology.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 2048500,
      checksum_sha256: 'abcd1234efgh5678',
      group_id: null,
      uploaded_by: 'user-admin-1',
      status: 'ACTIVE',
      created_at: '2026-10-04T12:00:00Z',
      updated_at: '2026-10-04T12:00:00Z',
    };

    expect(asset.storage_provider).toBe('GOOGLE_DRIVE');
    expect(asset.status).toBe('ACTIVE');
    expect(asset.group_id).toBeNull();
  });
});
