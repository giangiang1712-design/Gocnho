export type UserRole = 'her' | 'thanh';

export interface UserSession {
  username: string;
  role: UserRole;
  displayName: string;
  herNickname: string;
  loginAt: string;
}

export interface PolaroidPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  story: string;
  secretCaption?: string;
  date: string;
  emotionTag: string;
  likes: number;
  isLiked: boolean;
  rotation: number;
  featured?: boolean;
  createdAt: number;
}

export interface ChatMessageRelatedPhoto {
  id: string;
  caption: string;
  date: string;
  imageUrl: string;
  emotionTag?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'her' | 'thanh';
  text: string;
  timestamp: string;
  moodContext?: string;
  isProactiveReminder?: boolean;
  reminderTopic?: 'polaroid' | 'wellness' | 'wish' | 'daynote';
  relatedPhoto?: ChatMessageRelatedPhoto;
}

export type MoodKey = 'happy' | 'tired' | 'stressed' | 'missing';

export interface MoodJarItem {
  id: string;
  moodKey: MoodKey;
  title: string;
  subtitle: string;
  accentHex: string;
  bgHex: string;
  messages: string[];
}

export interface WishOption {
  id: string;
  title: string;
  subtitle: string;
  category: string;
}

export interface WishEntry {
  id: string;
  title: string;
  note: string;
  category?: string;
  createdAt: string;
  timestamp: number;
  fulfilledByThanh: boolean;
  thanhReply?: string;
  thanhPrivatePlan?: string;
}

export interface AppSettings {
  herNickname: string;
  senderAlias: string;
  welcomeNote: string;
  anniversaryDate: string;
  secretHeaderNote: string;
}

export type MusicTargetSection =
  | 'all'
  | 'page_01'
  | 'page_02'
  | 'page_03'
  | 'minigame';

export type MusicSourceType = 'youtube' | 'audio_url' | 'uploaded_file';

export interface MusicTrackItem {
  id: string;
  title: string;
  artistOrNote: string;
  sourceType: MusicSourceType;
  url: string;
  youtubeId?: string;
  mimeType?: string;
  targetSection: MusicTargetSection;
  autoPlay: boolean;
  createdAt: number;
}

export interface ExternalGameItem {
  id: string;
  title: string;
  subtitle: string;
  embedUrl: string;
  moodNote: string;
  isActive: boolean;
  createdAt: number;
}

export type MoodDiaryEmotion =
  | 'radiant'
  | 'peaceful'
  | 'tired'
  | 'busy'
  | 'thoughtful';

export interface MoodDiaryEntry {
  id: string;
  emotion: MoodDiaryEmotion;
  emotionLabel: string;
  shortNote: string;
  presetMessage: string;
  customAdminReply?: string;
  createdAt: string;
  timestamp: number;
}

export type MoodPresetConfig = Record<MoodDiaryEmotion, string[]>;

export interface CompanionMemoryItem {
  id: string;
  fact: string;
  updatedAt: string;
  timestamp: number;
}

export type WeatherMode = 'auto' | 'sunny' | 'rain' | 'starlight' | 'off';

export interface MoodCheckInTrigger {
  id: number;
  emotion: MoodDiaryEmotion;
  emotionLabel: string;
  createdAt: string;
}

