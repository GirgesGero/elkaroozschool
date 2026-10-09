/**
 * Persistent QR Code Asset Manager
 * Enforces the Single Source of Truth Rule:
 *   1 Person -> 1 Authoritative QR Identity -> 1 Persistent Stored QR Asset
 * 
 * Rules:
 *   - NEVER regenerate the QR image file on every profile view.
 *   - Query media_assets for existing QR asset by resource_id (person_id).
 *   - If found, reuse the existing persistent asset reference.
 *   - If missing, fail closed and direct the caller to the existing authorized
 *     person/media creation flow. Profile reads never create storage side effects.
 */

export interface PersistentQRAsset {
  assetId: string;
  personId: string;
  /** Present only when the existing storage metadata exposes the authoritative payload. */
  qrPayload?: string;
  fileName: string;
  mimeType: string;
  storageProvider: 'GOOGLE_DRIVE' | 'HOSTINGER_LOCAL';
  driveFileId?: string;
  publicUrl: string;
  generatedAt: string;
  isExisting: true;
}

export interface QRAssetSelector {
  /** Existing authoritative asset id, when the person record already stores it. */
  assetId?: string;
  /** Existing resource type from the current media architecture. */
  resourceType?: string;
  /** Existing file name from the current media architecture. */
  fileName?: string;
}

interface QRAssetQuery {
  select: (columns: string) => QRAssetQuery;
  is: (field: string, value: null) => QRAssetQuery;
  eq: (field: string, value: string | number) => QRAssetQuery;
  maybeSingle: () => Promise<{ data: { id: string; file_name: string; mime_type: string; storage_provider: string; drive_file_id?: string; created_at: string } | null; error: Error | null }>;
}

export class QRAssetManager {
  /**
   * Resolve the already-persisted asset. An explicit selector is required because
   * the repository does not contain the authoritative QR generator or payload.
   */
  static async resolvePersonQRAsset(
    person: { id: string },
    supabaseClient: { from: (table: string) => { select: (columns: string) => QRAssetQuery } },
    selector: QRAssetSelector
  ): Promise<PersistentQRAsset> {
    if (!supabaseClient) {
      throw new Error('A persistence adapter is required to resolve an authoritative QR asset.');
    }
    if (!selector?.assetId && !selector?.resourceType && !selector?.fileName) {
      throw new Error('An existing QR asset selector is required; profile reads never generate QR files.');
    }

    let query = supabaseClient
      .from('media_assets')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE');

    if (selector.assetId) {
      query = query.eq('id', selector.assetId);
    } else {
      query = query.eq('resource_id', person.id);
      if (selector.resourceType) query = query.eq('resource_type', selector.resourceType);
      if (selector.fileName) query = query.eq('file_name', selector.fileName);
    }

    const { data: existingAsset, error } = await query.maybeSingle();
    if (error) throw error;
    if (!existingAsset) {
      throw new Error('No persistent QR asset is associated with this person. Use the existing authorized person/media creation pipeline; profile reads never generate QR files.');
    }

    const provider = existingAsset.storage_provider;
    if (provider !== 'GOOGLE_DRIVE' && provider !== 'HOSTINGER_LOCAL') {
      throw new Error('The persisted QR asset uses an unsupported storage provider.');
    }

    return {
      assetId: existingAsset.id,
      personId: person.id,
      fileName: existingAsset.file_name,
      mimeType: existingAsset.mime_type,
      storageProvider: provider,
      driveFileId: existingAsset.drive_file_id,
      publicUrl: `/storage/file/${existingAsset.id}`,
      generatedAt: existingAsset.created_at,
      isExisting: true,
    };
  }
}

