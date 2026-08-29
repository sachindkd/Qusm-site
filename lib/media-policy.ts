export const MAX_MEDIA_FILE_SIZE = 8 * 1024 * 1024;
export const MAX_MEDIA_REQUEST_SIZE = 24 * 1024 * 1024;
export const DEVELOPER_MEDIA_RETENTION_DAYS = 30;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isSupportedMediaType(type: string) {
  return IMAGE_TYPES.has(type) || VIDEO_TYPES.has(type);
}

export function validateMediaFile(file: { size: number; type: string }) {
  if (!isSupportedMediaType(file.type)) {
    return "Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV.";
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    return "Files must be 8 MB or smaller. Please compress videos before uploading.";
  }

  return null;
}

export function getMediaUploadHelp() {
  return `Photos and videos must be 8 MB or smaller. For videos, compress them using 8mb.video before uploading.`;
}

export function shouldDeleteDeveloperMedia(createdAt: string, now = Date.now()) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now - created >= DEVELOPER_MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}
