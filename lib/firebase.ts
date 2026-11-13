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

export interface CloudSnapshot {
  unchanged?: boolean;
  photos: PolaroidPhoto[];
  moodJars: MoodJarItem[];
  wishes: WishEntry[];
  settings: AppSettings;
  musicTracks?: MusicTrackItem[];
  externalGames?: ExternalGameItem[];
  moodDiaryEntries?: MoodDiaryEntry[];
  moodPresetConfig?: MoodPresetConfig;
  companionMemories?: CompanionMemoryItem[];
  updatedAt: number;
}

export interface MockAuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'her' | 'thanh';
  isMock: boolean;
}

export function hasValidFirebaseCredentials(): boolean {
  return false;
}

export function isFirebaseConfigured(): boolean {
  return true;
}

let currentMockUser: MockAuthUser | null = null;

export async function signInWithFirebaseAccount(
  username: string,
  _password?: string
): Promise<MockAuthUser> {
  const cleanUser = username.trim().toLowerCase();
  const role: 'her' | 'thanh' = cleanUser === 'anhthanh' ? 'thanh' : 'her';
  const email = cleanUser.includes('@')
    ? cleanUser
    : `${cleanUser}@gocnhochualanh.local`;

  const mockUser: MockAuthUser = {
    uid: `mock-uid-${cleanUser}`,
    email,
    displayName: role === 'thanh' ? 'Người Trông Coi Góc Nhỏ' : 'Quỳnh Anh',
    role,
    isMock: true,
  };

  currentMockUser = mockUser;
  return mockUser;
}

export async function signOutFirebaseAccount(): Promise<void> {
  currentMockUser = null;
}

export function getCurrentAuthUser(): MockAuthUser | null {
  return currentMockUser;
}

export async function fetchServerDatabaseSnapshot(
  sinceTimestamp?: number
): Promise<CloudSnapshot | null> {
  try {
    const url =
      sinceTimestamp && sinceTimestamp > 0
        ? `/api/db?since=${sinceTimestamp}`
        : '/api/db';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as CloudSnapshot;
  } catch {
    return null;
  }
}

export async function syncPhotosFromFirestore(): Promise<PolaroidPhoto[] | null> {
  const snap = await fetchServerDatabaseSnapshot();
  return snap?.photos || null;
}

export async function savePhotoToFirebase(
  photo: PolaroidPhoto
): Promise<PolaroidPhoto> {
  const finalPhoto: PolaroidPhoto = { ...photo };

  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_photo', payload: finalPhoto }),
    });
  } catch {
    // Local IndexedDB will still persist the photo
  }

  return finalPhoto;
}

export async function deletePhotoFromFirebase(photoId: string): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_photo', payload: { photoId } }),
    });
  } catch {
    // Local IndexedDB will still delete the photo
  }
}

export async function saveWishToFirestore(wish: WishEntry): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_wish', payload: wish }),
    });
  } catch {
    // Ignore
  }
}

export async function updateWishesInServerDb(
  wishes: WishEntry[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_wishes', payload: wishes }),
    });
  } catch {
    // Ignore
  }
}

export async function saveMoodJarsToServerDb(
  jars: MoodJarItem[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_mood_jars', payload: jars }),
    });
  } catch {
    // Ignore
  }
}

export async function saveSettingsToServerDb(
  settings: AppSettings
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_settings', payload: settings }),
    });
  } catch {
    // Ignore
  }
}

export async function saveMusicTracksToServerDb(
  musicTracks: MusicTrackItem[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_music_tracks',
        payload: musicTracks,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function appendMusicTracksToServerDb(
  newTracks: MusicTrackItem[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append_music_tracks',
        payload: newTracks,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function saveExternalGamesToServerDb(
  externalGames: ExternalGameItem[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_external_games',
        payload: externalGames,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function saveMoodDiaryEntriesToServerDb(
  entries: MoodDiaryEntry[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_mood_diary_entries',
        payload: entries,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function saveMoodPresetConfigToServerDb(
  config: MoodPresetConfig
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_mood_preset_config',
        payload: config,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function saveCompanionMemoriesToServerDb(
  memories: CompanionMemoryItem[]
): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_companion_memories',
        payload: memories,
      }),
    });
  } catch {
    // Ignore
  }
}
