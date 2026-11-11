/**
 * src/lib/terra/docs/assets.ts
 * Uploads, assembles, and downloads Docs assets.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { actions } from '../runtime/action-proxy.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const ASSET_CHUNK_SIZE_BYTES = 0.9 * 1024 * 1024;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Uploads a file in bounded chunks so the host can assemble large attachments without one request body.
 *
 * @param file Browser file whose bytes and MIME type are sent to the host attachment API.
 * @param dPath Document path that owns the uploaded asset.
 * @param opts Optional image conversion settings and byte-progress callback.
 * @return Asset metadata returned by the host after the final chunk, or an empty object if it omits metadata.
 * @remarks Chunk requests reuse a stable upload ID; image options and preview paths are sent with each part.
 */
export async function uploadAssetChunked(
  file: File,
  dPath: string,
  opts?: {
    resize?: boolean;
    grayscale?: boolean;
    previewAssetPath?: string;
    onProgress?: (data: {
      bytes: number;
      currentChunk: number;
      totalChunks: number;
      message?: string;
    }) => void;
  },
): Promise<{ id?: string; path?: string; src?: string; compressedSize?: number; name?: string }> {
  const totalChunks = Math.ceil(file.size / ASSET_CHUNK_SIZE_BYTES) || 1;
  let finalAsset: {
    id?: string;
    path?: string;
    src?: string;
    compressedSize?: number;
    name?: string;
  } | null = null;
  for (let c = 0; c < totalChunks; c++) {
    const chunk = file.slice(c * ASSET_CHUNK_SIZE_BYTES, (c + 1) * ASSET_CHUNK_SIZE_BYTES);
    const formData = new FormData();
    formData.append('file', new File([chunk], file.name, { type: file.type }));
    formData.append('path', dPath);
    formData.append(
      'fileId',
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    );
    formData.append('chunkIndex', String(c));
    formData.append('totalChunks', String(totalChunks));
    if (opts?.resize) formData.append('resize', 'true');
    if (opts?.grayscale) formData.append('grayscale', 'true');
    if (opts?.previewAssetPath) formData.append('assetPath', opts.previewAssetPath);
    try {
      // native Astro Actions client automatically handles multipart/form-data encoding and routing!
      const { data, error } = await actions.write.asset.upload(formData);
      if (error)
        throw new Error(
          error instanceof Error
            ? error.message
            : typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof error.message === 'string'
              ? error.message
              : 'Action rejected the payload',
        );
      if (c === totalChunks - 1)
        finalAsset = data as {
          id?: string;
          path?: string;
          src?: string;
          compressedSize?: number;
          name?: string;
        };
      if (opts?.onProgress)
        opts.onProgress({ bytes: chunk.size, currentChunk: c + 1, totalChunks });
    } catch (err) {
      console.error(`[uploadAssetChunked] Error on chunk ${c}:`, err);
      throw err;
    }
  }
  if (!finalAsset) throw new Error('Upload failed to return final attachment.');
  return finalAsset;
}
