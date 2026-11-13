import fs from 'fs';
import path from 'path';
import type {
  AppSettings,
  CompanionMemoryItem,
  ExternalGameItem,
  MoodDiaryEntry,
  MoodJarItem,
  MoodPresetConfig,
  MusicTrackItem,
  PolaroidPhoto,
  WishEntry,
} from './types';
import {
  DEFAULT_EXTERNAL_GAMES,
  DEFAULT_MOOD_JARS,
  DEFAULT_MOOD_PRESET_CONFIG,
  DEFAULT_MUSIC_TRACKS,
  DEFAULT_SETTINGS,
  INITIAL_MOOD_DIARY_ENTRIES,
  SEED_POLAROID_PHOTOS,
} from './seed-data';

export interface ServerDatabaseSchema {
  photos: PolaroidPhoto[];
  moodJars: MoodJarItem[];
  wishes: WishEntry[];
  settings: AppSettings;
  musicTracks: MusicTrackItem[];
  externalGames: ExternalGameItem[];
  moodDiaryEntries: MoodDiaryEntry[];
  moodPresetConfig: MoodPresetConfig;
  companionMemories?: CompanionMemoryItem[];
  updatedAt: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE_PATH = path.join(DATA_DIR, 'goc-nho-quynh-anh-v3.json');

const INITIAL_WISHES: WishEntry[] = [
  {
    id: 'wish-init-1',
    title: 'Một ly trà sữa ngọt dịu',
    note: 'Chiều nay trời mát mẻ, tự nhiên muốn uống một ly trà sữa ít ngọt.',
    createdAt: 'Hôm qua · 16:20',
    timestamp: 1794213300000,
    fulfilledByThanh: true,
    thanhReply: 'Đã ghi nhận tín hiệu nhỏ này của Quỳnh Anh!',
  },
];

let memoryDb: ServerDatabaseSchema | null = null;

function createInitialDb(): ServerDatabaseSchema {
  return {
    photos: [...SEED_POLAROID_PHOTOS],
    moodJars: [...DEFAULT_MOOD_JARS],
    wishes: [...INITIAL_WISHES],
    settings: { ...DEFAULT_SETTINGS },
    musicTracks: [...DEFAULT_MUSIC_TRACKS],
    externalGames: [...DEFAULT_EXTERNAL_GAMES],
    moodDiaryEntries: [...INITIAL_MOOD_DIARY_ENTRIES],
    moodPresetConfig: { ...DEFAULT_MOOD_PRESET_CONFIG },
    companionMemories: [],
    updatedAt: Date.now(),
  };
}

export function readServerDb(): ServerDatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerDatabaseSchema>;
      memoryDb = {
        photos:
          parsed.photos && parsed.photos.length > 0
            ? parsed.photos
            : [...SEED_POLAROID_PHOTOS],
        moodJars:
          parsed.moodJars && parsed.moodJars.length > 0
            ? parsed.moodJars
            : [...DEFAULT_MOOD_JARS],
        wishes: parsed.wishes || [...INITIAL_WISHES],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        musicTracks: parsed.musicTracks || [...DEFAULT_MUSIC_TRACKS],
        externalGames: parsed.externalGames || [...DEFAULT_EXTERNAL_GAMES],
        moodDiaryEntries:
          parsed.moodDiaryEntries || [...INITIAL_MOOD_DIARY_ENTRIES],
        moodPresetConfig: {
          ...DEFAULT_MOOD_PRESET_CONFIG,
          ...(parsed.moodPresetConfig || {}),
        },
        companionMemories: parsed.companionMemories || [],
        updatedAt: parsed.updatedAt || Date.now(),
      };
      return memoryDb;
    }
  } catch {
    // Fallback to in-memory DB if filesystem is read-only
  }

  memoryDb = createInitialDb();
  writeServerDb(memoryDb);
  return memoryDb;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dirCreated = false;

function scheduleAsyncDiskFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    if (!memoryDb) return;
    try {
      if (!dirCreated) {
        if (!fs.existsSync(DATA_DIR)) {
          await fs.promises.mkdir(DATA_DIR, { recursive: true });
        }
        dirCreated = true;
      }
      await fs.promises.writeFile(
        DB_FILE_PATH,
        JSON.stringify(memoryDb),
        'utf-8'
      );
    } catch {
      // Keep in memoryDb if disk write is restricted
    }
  }, 40);
}

export function writeServerDb(
  nextDb: ServerDatabaseSchema
): ServerDatabaseSchema {
  memoryDb = {
    ...nextDb,
    updatedAt: Date.now(),
  };

  scheduleAsyncDiskFlush();

  return memoryDb;
}
