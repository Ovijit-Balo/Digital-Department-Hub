import { cmsApi } from '../api/modules';

const MAX_FALLBACK_BYTES = 2 * 1024 * 1024; // 2 MB inline fallback cap

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a media file and resolves to a usable URL.
 *
 * Primary path: request a signed upload from the backend and push the file
 * directly to Cloudinary. If signing is not configured (or the upload fails),
 * fall back to an inline data URL for small files so authoring still works in
 * environments without a media provider.
 */
export async function uploadImage(file, { folder = 'digital-department-hub/cms', resourceType = 'auto' } = {}) {
  if (!file) {
    throw new Error('No file selected.');
  }

  try {
    const { data } = await cmsApi.createUploadSignature({ folder });
    const signature = data.signature;

    if (!signature?.cloudName) {
      throw new Error('Upload signature unavailable.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', signature.timestamp);
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );
    const result = await response.json();

    if (result.secure_url) {
      return { url: result.secure_url, provider: 'cloudinary' };
    }

    throw new Error(result.error?.message || 'Media upload failed.');
  } catch {
    // Fallback: inline small files as data URLs so the demo works without Cloudinary.
    if (file.size <= MAX_FALLBACK_BYTES) {
      const dataUrl = await readAsDataUrl(file);
      return { url: dataUrl, provider: 'inline' };
    }

    throw new Error(
      'Media upload is not configured and the file is too large to embed (max 2 MB). Paste an image URL instead.'
    );
  }
}

export default uploadImage;
