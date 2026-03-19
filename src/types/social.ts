export type SocialPlatform = 'youtube' | 'tiktok';

export type YouTubePrivacyStatus = 'private' | 'unlisted' | 'public';

export type UploadDraft = {
  title: string;
  description: string;
  hashtags: string;
  privacyStatus: YouTubePrivacyStatus;
};

export type PlatformConnectionStatus = {
  platform: SocialPlatform;
  configured: boolean;
  connected: boolean;
  displayName?: string;
  avatarUrl?: string;
  channelId?: string;
  message?: string;
};

export type UploadResult = {
  platform: SocialPlatform;
  success: boolean;
  message: string;
  uploadedAt: string;
  videoId?: string;
  videoUrl?: string;
};
