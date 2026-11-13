import type {
  AppSettings,
  ChatMessage,
  CompanionMemoryItem,
  ExternalGameItem,
  MoodDiaryEmotion,
  MoodDiaryEntry,
  MoodJarItem,
  MoodPresetConfig,
  MusicTrackItem,
  PolaroidPhoto,
  UserSession,
  WishEntry,
  WishOption,
} from './types';
import {
  appendMusicTracksToServerDb,
  deletePhotoFromFirebase,
  fetchServerDatabaseSnapshot,
  isFirebaseConfigured,
  saveCompanionMemoriesToServerDb,
  saveExternalGamesToServerDb,
  saveMoodDiaryEntriesToServerDb,
  saveMoodJarsToServerDb,
  saveMoodPresetConfigToServerDb,
  saveMusicTracksToServerDb,
  savePhotoToFirebase,
  saveSettingsToServerDb,
  saveWishToFirestore,
  syncPhotosFromFirestore,
  updateWishesInServerDb,
} from './firebase';

const DB_NAME = 'GocNhoQuynhAnhDB_v3';
const DB_VERSION = 4;
const PHOTO_STORE = 'polaroid_photos';
const MUSIC_STORE = 'music_tracks';

const STORAGE_KEYS = {
  SESSION: 'gnqa_session_v3',
  SETTINGS: 'gnqa_settings_v3',
  MOOD_JARS: 'gnqa_mood_jars_v3',
  WISHES: 'gnqa_wishes_v3',
  CHAT_HISTORY: 'gnqa_chat_history_v3',
  COMPANION_MEMORY: 'gnqa_companion_memory_v3',
  MUSIC_TRACKS: 'gnqa_music_tracks_v3',
  EXTERNAL_GAMES: 'gnqa_external_games_v3',
  MOOD_DIARY: 'gnqa_mood_diary_v3',
  MOOD_PRESET_CONFIG: 'gnqa_mood_preset_config_v3',
  LAST_SYNC_AT: 'gnqa_last_sync_at_v3',
  SEEDED: 'gnqa_seeded_v3',
};

import {
  DEFAULT_EXTERNAL_GAMES,
  DEFAULT_MOOD_JARS,
  DEFAULT_MOOD_PRESET_CONFIG,
  DEFAULT_MUSIC_TRACKS,
  DEFAULT_SETTINGS,
  DEFAULT_WISH_OPTIONS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_MOOD_DIARY_ENTRIES,
  MOOD_DIARY_EMOTIONS,
  SEED_POLAROID_PHOTOS,
} from './seed-data';

export {
  DEFAULT_EXTERNAL_GAMES,
  DEFAULT_MOOD_JARS,
  DEFAULT_MOOD_PRESET_CONFIG,
  DEFAULT_MUSIC_TRACKS,
  DEFAULT_SETTINGS,
  DEFAULT_WISH_OPTIONS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_MOOD_DIARY_ENTRIES,
  MOOD_DIARY_EMOTIONS,
  SEED_POLAROID_PHOTOS,
};

// IndexedDB helper for Polaroid photos & multi-track Music playlists
function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MUSIC_STORE)) {
        db.createObjectStore(MUSIC_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const DataService = {
  // Authentication & Session
  authenticate(usernameInput: string, passwordInput: string): UserSession | null {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();
    const settings = this.getSettings();

    if (
      (cleanUser === 'quynhanh' ||
        cleanUser === 'quỳnh anh' ||
        cleanUser === 'emxinh') &&
      cleanPass === 'gocnho123'
    ) {
      const session: UserSession = {
        username: 'quynhanh',
        role: 'her',
        displayName: settings.herNickname || 'Quỳnh Anh',
        herNickname: settings.herNickname || 'Quỳnh Anh',
        loginAt: new Date().toISOString(),
      };
      this.saveSession(session);
      return session;
    }

    if (
      (cleanUser === 'anhthanh' || cleanUser === 'admin' || cleanUser === 'gocnho') &&
      cleanPass === 'admin123'
    ) {
      const session: UserSession = {
        username: 'anhthanh',
        role: 'thanh',
        displayName: 'Người Trông Coi Góc Nhỏ',
        herNickname: settings.herNickname || 'Quỳnh Anh',
        loginAt: new Date().toISOString(),
      };
      this.saveSession(session);
      return session;
    }

    return null;
  },

  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return null;
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  },

  saveSession(session: UserSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // Synchronize all data from built-in Server Database using conditional delta check
  async syncAllFromServer(forceFull = false) {
    let sinceTimestamp = 0;
    if (!forceFull && typeof window !== 'undefined') {
      const rawSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
      const hasSettings = Boolean(localStorage.getItem(STORAGE_KEYS.SETTINGS));
      if (rawSync && hasSettings) {
        const parsed = Number(rawSync);
        if (!Number.isNaN(parsed) && parsed > 0) {
          sinceTimestamp = parsed;
        }
      }
    }

    const snap = await fetchServerDatabaseSnapshot(sinceTimestamp);
    if (!snap) return null;
    if (snap.unchanged) {
      return snap;
    }

    if (typeof window !== 'undefined') {
      if (snap.updatedAt) {
        localStorage.setItem(
          STORAGE_KEYS.LAST_SYNC_AT,
          String(snap.updatedAt)
        );
      }
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(snap.settings)
      );
      localStorage.setItem(
        STORAGE_KEYS.MOOD_JARS,
        JSON.stringify(snap.moodJars)
      );
      localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(snap.wishes));
      if (snap.musicTracks) {
        this.cacheMusicTracksLocally(snap.musicTracks).catch(() => {});
        try {
          const compactTracks = snap.musicTracks.map((t) =>
            t.url.startsWith('data:audio') && t.url.length > 200000
              ? { ...t, url: '' }
              : t
          );
          localStorage.setItem(
            STORAGE_KEYS.MUSIC_TRACKS,
            JSON.stringify(compactTracks)
          );
        } catch {
          // IndexedDB already holds full tracks
        }
      }
      if (snap.externalGames) {
        localStorage.setItem(
          STORAGE_KEYS.EXTERNAL_GAMES,
          JSON.stringify(snap.externalGames)
        );
      }
      if (snap.moodDiaryEntries) {
        localStorage.setItem(
          STORAGE_KEYS.MOOD_DIARY,
          JSON.stringify(snap.moodDiaryEntries)
        );
      }
      if (snap.moodPresetConfig) {
        localStorage.setItem(
          STORAGE_KEYS.MOOD_PRESET_CONFIG,
          JSON.stringify(snap.moodPresetConfig)
        );
      }
      if (snap.companionMemories) {
        localStorage.setItem(
          STORAGE_KEYS.COMPANION_MEMORY,
          JSON.stringify(snap.companionMemories)
        );
      }
      if (snap.photos && snap.photos.length > 0) {
        this.cachePhotosLocally(snap.photos).catch(() => {});
      }
    }
    return snap;
  },

  // App Settings
  getSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): AppSettings {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      const currentSession = this.getSession();
      if (currentSession) {
        const updatedSession: UserSession = {
          ...currentSession,
          herNickname: settings.herNickname,
          displayName:
            currentSession.role === 'her'
              ? settings.herNickname
              : currentSession.displayName,
        };
        this.saveSession(updatedSession);
      }
    }
    saveSettingsToServerDb(settings).catch(() => {});
    return settings;
  },

  // Read local IndexedDB photos only (without triggering a duplicate network request)
  async getLocalPhotosOnly(): Promise<PolaroidPhoto[]> {
    if (typeof window === 'undefined') return SEED_POLAROID_PHOTOS;
    try {
      const db = await openPhotoDB();
      const photos = await new Promise<PolaroidPhoto[]>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readonly');
        const store = tx.objectStore(PHOTO_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as PolaroidPhoto[]);
        req.onerror = () => reject(req.error);
      });

      const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
      if (photos.length === 0 && !isSeeded) {
        await this.seedInitialPhotos(db);
        localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
        return SEED_POLAROID_PHOTOS;
      }

      return photos.length > 0
        ? photos.sort((a, b) => b.createdAt - a.createdAt)
        : SEED_POLAROID_PHOTOS;
    } catch {
      return SEED_POLAROID_PHOTOS;
    }
  },

  async cachePhotosLocally(photos: PolaroidPhoto[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await openPhotoDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        store.clear();
        photos.forEach((photo) => {
          store.put(photo);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    } catch {
      // Ignore IndexedDB quota or restricted mode errors
    }
  },

  // Polaroid Photos (Built-in Server DB + IndexedDB Cache)
  async getPhotos(): Promise<PolaroidPhoto[]> {
    if (typeof window === 'undefined') return SEED_POLAROID_PHOTOS;

    if (isFirebaseConfigured()) {
      try {
        const cloudPhotos = await syncPhotosFromFirestore();
        if (cloudPhotos && cloudPhotos.length > 0) {
          this.cachePhotosLocally(cloudPhotos).catch(() => {});
          return cloudPhotos.sort((a, b) => b.createdAt - a.createdAt);
        }
      } catch {
        // Fallback to IndexedDB
      }
    }

    return this.getLocalPhotosOnly();
  },

  async seedInitialPhotos(dbInstance?: IDBDatabase): Promise<void> {
    try {
      const db = dbInstance || (await openPhotoDB());
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        SEED_POLAROID_PHOTOS.forEach((photo) => {
          store.put(photo);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore seed error on restricted environments
    }
  },

  async savePhoto(photo: PolaroidPhoto): Promise<PolaroidPhoto> {
    let finalPhoto = photo;
    if (isFirebaseConfigured()) {
      try {
        finalPhoto = await savePhotoToFirebase(photo);
      } catch {
        // Continue saving locally
      }
    }

    try {
      const db = await openPhotoDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        store.put(finalPhoto);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback
    }
    return finalPhoto;
  },

  async setFeaturedPhoto(photoId: string): Promise<PolaroidPhoto[]> {
    const photos = await this.getPhotos();
    const target = photos.find((p) => p.id === photoId);
    if (!target) return photos;
    const reordered: PolaroidPhoto[] = [
      { ...target, featured: true },
      ...photos.filter((p) => p.id !== photoId).map((p) => ({ ...p, featured: false })),
    ];
    try {
      const db = await openPhotoDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        reordered.forEach((p) => store.put(p));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback
    }

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_featured_photo', payload: { photoId } }),
      });
    } catch {
      // Ignore
    }
    return reordered;
  },

  async deletePhoto(photoId: string): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await deletePhotoFromFirebase(photoId);
      } catch {
        // Continue local deletion
      }
    }

    try {
      const db = await openPhotoDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        store.delete(photoId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore
    }
  },

  // Mood Jars
  getMoodJars(): MoodJarItem[] {
    if (typeof window === 'undefined') return DEFAULT_MOOD_JARS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MOOD_JARS);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEYS.MOOD_JARS,
          JSON.stringify(DEFAULT_MOOD_JARS)
        );
        return DEFAULT_MOOD_JARS;
      }
      return JSON.parse(raw) as MoodJarItem[];
    } catch {
      return DEFAULT_MOOD_JARS;
    }
  },

  saveMoodJars(jars: MoodJarItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.MOOD_JARS, JSON.stringify(jars));
    saveMoodJarsToServerDb(jars).catch(() => {});
  },

  // Wishes
  getWishes(): WishEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WISHES);
      if (!raw) {
        const initialWishes: WishEntry[] = [
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
        localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(initialWishes));
        return initialWishes;
      }
      return (JSON.parse(raw) as WishEntry[]).sort(
        (a, b) => b.timestamp - a.timestamp
      );
    } catch {
      return [];
    }
  },

  async addWish(
    title: string,
    note: string,
    category?: string
  ): Promise<WishEntry> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });

    const newWish: WishEntry = {
      id: `wish-${Date.now()}`,
      title,
      note: note.trim() || 'Một mong muốn nhỏ cho ngày hôm nay thêm vui.',
      category: category?.trim() || 'Điều ước nhỏ',
      createdAt: `${dateStr} · ${timeStr}`,
      timestamp: Date.now(),
      fulfilledByThanh: false,
    };

    const current = this.getWishes();
    const updated = [newWish, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(updated));
    }

    if (isFirebaseConfigured()) {
      try {
        await saveWishToFirestore(newWish);
      } catch {
        // Ignore cloud sync error
      }
    }

    return newWish;
  },

  updateWishStatus(
    wishId: string,
    fulfilled: boolean,
    thanhReply?: string,
    thanhPrivatePlan?: string
  ): WishEntry[] {
    const current = this.getWishes();
    const updated = current.map((w) =>
      w.id === wishId
        ? {
            ...w,
            fulfilledByThanh: fulfilled,
            thanhReply: thanhReply !== undefined ? thanhReply : w.thanhReply,
            thanhPrivatePlan:
              thanhPrivatePlan !== undefined
                ? thanhPrivatePlan
                : w.thanhPrivatePlan,
          }
        : w
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(updated));
    }
    updateWishesInServerDb(updated).catch(() => {});
    return updated;
  },

  deleteWish(wishId: string): WishEntry[] {
    const current = this.getWishes();
    const updated = current.filter((w) => w.id !== wishId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(updated));
    }
    updateWishesInServerDb(updated).catch(() => {});
    return updated;
  },

  // Chat History
  getChatHistory(): ChatMessage[] {
    if (typeof window === 'undefined') return INITIAL_CHAT_MESSAGES;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEYS.CHAT_HISTORY,
          JSON.stringify(INITIAL_CHAT_MESSAGES)
        );
        return INITIAL_CHAT_MESSAGES;
      }
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (!Array.isArray(parsed)) return INITIAL_CHAT_MESSAGES;

      const seenIds = new Set<string>();
      let hadDuplicates = false;
      const normalized = parsed.map((msg, idx) => {
        const baseId = msg?.id ? String(msg.id) : `msg-restored-${idx}`;
        if (!seenIds.has(baseId)) {
          seenIds.add(baseId);
          return msg;
        }
        hadDuplicates = true;
        let uniqueId = `${baseId}-u${idx}`;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${uniqueId}-${Math.random().toString(36).slice(2, 5)}`;
        }
        seenIds.add(uniqueId);
        return { ...msg, id: uniqueId };
      });

      if (hadDuplicates) {
        localStorage.setItem(
          STORAGE_KEYS.CHAT_HISTORY,
          JSON.stringify(normalized)
        );
      }
      return normalized;
    } catch {
      return INITIAL_CHAT_MESSAGES;
    }
  },

  saveChatHistory(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    const seenIds = new Set<string>();
    const normalized = messages.map((msg, idx) => {
      const baseId = msg?.id ? String(msg.id) : `msg-${Date.now()}-${idx}`;
      if (!seenIds.has(baseId)) {
        seenIds.add(baseId);
        return msg;
      }
      let uniqueId = `${baseId}-u${idx}`;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId}-${Math.random().toString(36).slice(2, 5)}`;
      }
      seenIds.add(uniqueId);
      return { ...msg, id: uniqueId };
    });
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(normalized));
  },

  clearChatHistory(): ChatMessage[] {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.CHAT_HISTORY,
        JSON.stringify(INITIAL_CHAT_MESSAGES)
      );
    }
    return INITIAL_CHAT_MESSAGES;
  },

  // Long-term Companion Memory (remembering preferences, habits, stories across days)
  getCompanionMemories(): CompanionMemoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPANION_MEMORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CompanionMemoryItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.fact === 'string' && item.fact.trim())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 16);
    } catch {
      return [];
    }
  },

  saveCompanionMemories(memories: CompanionMemoryItem[]): CompanionMemoryItem[] {
    const trimmed = memories.slice(0, 16);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COMPANION_MEMORY, JSON.stringify(trimmed));
    }
    saveCompanionMemoriesToServerDb(trimmed).catch(() => {});
    return trimmed;
  },

  mergeCompanionMemoryFacts(newFacts: string[]): CompanionMemoryItem[] {
    const cleaned = newFacts
      .map((f) => (typeof f === 'string' ? f.trim() : ''))
      .filter((f) => f.length >= 4 && f.length <= 200);
    if (cleaned.length === 0) {
      return this.getCompanionMemories();
    }

    const existing = this.getCompanionMemories();
    const normalizeFact = (s: string) =>
      s
        .toLowerCase()
        .replace(/[.,!?;:"'()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const now = Date.now();
    const dateLabel = new Date(now).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });

    const updated = [...existing];
    for (let i = 0; i < cleaned.length; i++) {
      const fact = cleaned[i];
      const norm = normalizeFact(fact);
      if (!norm) continue;
      const duplicateIdx = updated.findIndex((item) => {
        const existingNorm = normalizeFact(item.fact);
        return (
          existingNorm === norm ||
          existingNorm.includes(norm) ||
          norm.includes(existingNorm)
        );
      });

      const entry: CompanionMemoryItem = {
        id: `mem-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        fact,
        updatedAt: dateLabel,
        timestamp: now + i,
      };

      if (duplicateIdx >= 0) {
        updated.splice(duplicateIdx, 1);
      }
      updated.unshift(entry);
    }

    return this.saveCompanionMemories(updated);
  },

  // Music Tracks (Admin section-targeted multi-format audio Playlist stored in IndexedDB + Server DB)
  getMusicTracks(): MusicTrackItem[] {
    if (typeof window === 'undefined') return DEFAULT_MUSIC_TRACKS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MUSIC_TRACKS);
      if (!raw) return DEFAULT_MUSIC_TRACKS;
      const parsed = JSON.parse(raw) as MusicTrackItem[];
      return parsed.filter((t) => Boolean(t.url));
    } catch {
      return DEFAULT_MUSIC_TRACKS;
    }
  },

  async getLocalMusicTracksOnly(): Promise<MusicTrackItem[]> {
    if (typeof window === 'undefined') return DEFAULT_MUSIC_TRACKS;
    try {
      const db = await openPhotoDB();
      if (!db.objectStoreNames.contains(MUSIC_STORE)) {
        return this.getMusicTracks();
      }
      const tracks = await new Promise<MusicTrackItem[]>((resolve, reject) => {
        const tx = db.transaction(MUSIC_STORE, 'readonly');
        const store = tx.objectStore(MUSIC_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as MusicTrackItem[]);
        req.onerror = () => reject(req.error);
      });
      if (tracks.length > 0) {
        return tracks.sort((a, b) => b.createdAt - a.createdAt);
      }
      return this.getMusicTracks();
    } catch {
      return this.getMusicTracks();
    }
  },

  async cacheMusicTracksLocally(tracks: MusicTrackItem[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await openPhotoDB();
      if (!db.objectStoreNames.contains(MUSIC_STORE)) return;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(MUSIC_STORE, 'readwrite');
        const store = tx.objectStore(MUSIC_STORE);
        store.clear();
        tracks.forEach((track) => {
          store.put(track);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore IndexedDB quota/restricted errors
    }
  },

  async saveMusicTracks(tracks: MusicTrackItem[]): Promise<MusicTrackItem[]> {
    if (typeof window !== 'undefined') {
      await this.cacheMusicTracksLocally(tracks);
      try {
        localStorage.setItem(STORAGE_KEYS.MUSIC_TRACKS, JSON.stringify(tracks));
      } catch {
        // Store compact non-audio-blob metadata in localStorage if total size > 5MB
        try {
          const compact = tracks.map((t) =>
            t.url.startsWith('data:audio') && t.url.length > 200000
              ? { ...t, url: '' }
              : t
          );
          localStorage.setItem(
            STORAGE_KEYS.MUSIC_TRACKS,
            JSON.stringify(compact)
          );
        } catch {
          // Ignore; IndexedDB + Server DB hold all tracks
        }
      }
    }
    await saveMusicTracksToServerDb(tracks).catch(() => {});
    return tracks;
  },

  async appendMusicTracks(
    newTracks: MusicTrackItem[],
    allTracks: MusicTrackItem[]
  ): Promise<MusicTrackItem[]> {
    if (typeof window !== 'undefined') {
      await this.cacheMusicTracksLocally(allTracks);
      try {
        localStorage.setItem(
          STORAGE_KEYS.MUSIC_TRACKS,
          JSON.stringify(allTracks)
        );
      } catch {
        try {
          const compact = allTracks.map((t) =>
            t.url.startsWith('data:audio') && t.url.length > 200000
              ? { ...t, url: '' }
              : t
          );
          localStorage.setItem(
            STORAGE_KEYS.MUSIC_TRACKS,
            JSON.stringify(compact)
          );
        } catch {
          // Ignore
        }
      }
    }
    await appendMusicTracksToServerDb(newTracks).catch(() => {});
    return allTracks;
  },

  // External Embedded Games (Admin game library)
  getExternalGames(): ExternalGameItem[] {
    if (typeof window === 'undefined') return DEFAULT_EXTERNAL_GAMES;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXTERNAL_GAMES);
      if (!raw) return DEFAULT_EXTERNAL_GAMES;
      return JSON.parse(raw) as ExternalGameItem[];
    } catch {
      return DEFAULT_EXTERNAL_GAMES;
    }
  },

  saveExternalGames(games: ExternalGameItem[]): ExternalGameItem[] {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.EXTERNAL_GAMES, JSON.stringify(games));
    }
    saveExternalGamesToServerDb(games).catch(() => {});
    return games;
  },

  // Daily Mood Diary & Preset Replies (Listening Station / Trạm Lắng Nghe)
  getMoodPresetConfig(): MoodPresetConfig {
    if (typeof window === 'undefined') return DEFAULT_MOOD_PRESET_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MOOD_PRESET_CONFIG);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEYS.MOOD_PRESET_CONFIG,
          JSON.stringify(DEFAULT_MOOD_PRESET_CONFIG)
        );
        return DEFAULT_MOOD_PRESET_CONFIG;
      }
      return { ...DEFAULT_MOOD_PRESET_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_MOOD_PRESET_CONFIG;
    }
  },

  saveMoodPresetConfig(config: MoodPresetConfig): MoodPresetConfig {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.MOOD_PRESET_CONFIG,
        JSON.stringify(config)
      );
    }
    saveMoodPresetConfigToServerDb(config).catch(() => {});
    return config;
  },

  getMoodDiaryEntries(): MoodDiaryEntry[] {
    if (typeof window === 'undefined') return INITIAL_MOOD_DIARY_ENTRIES;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MOOD_DIARY);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEYS.MOOD_DIARY,
          JSON.stringify(INITIAL_MOOD_DIARY_ENTRIES)
        );
        return INITIAL_MOOD_DIARY_ENTRIES;
      }
      return (JSON.parse(raw) as MoodDiaryEntry[]).sort(
        (a, b) => b.timestamp - a.timestamp
      );
    } catch {
      return INITIAL_MOOD_DIARY_ENTRIES;
    }
  },

  saveMoodDiaryEntries(entries: MoodDiaryEntry[]): MoodDiaryEntry[] {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOOD_DIARY, JSON.stringify(entries));
    }
    saveMoodDiaryEntriesToServerDb(entries).catch(() => {});
    return entries;
  },

  addMoodDiaryEntry(
    emotion: MoodDiaryEmotion,
    shortNote: string
  ): MoodDiaryEntry {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });

    const emotionMeta =
      MOOD_DIARY_EMOTIONS.find((e) => e.key === emotion) ||
      MOOD_DIARY_EMOTIONS[0];
    const presetConfig = this.getMoodPresetConfig();
    const pool =
      presetConfig[emotion] && presetConfig[emotion].length > 0
        ? presetConfig[emotion]
        : DEFAULT_MOOD_PRESET_CONFIG[emotion];
    const currentEntries = this.getMoodDiaryEntries();
    const chosenPreset =
      pool[currentEntries.length % pool.length] || pool[0];

    const newEntry: MoodDiaryEntry = {
      id: `diary-${now.getTime()}`,
      emotion,
      emotionLabel: emotionMeta.label,
      shortNote:
        shortNote.trim() ||
        `Một nhịp cảm xúc ${emotionMeta.label.toLowerCase()} được lưu lại trong ngày.`,
      presetMessage: chosenPreset,
      createdAt: `${dateStr} · ${timeStr}`,
      timestamp: now.getTime(),
    };

    const nextEntries = [newEntry, ...currentEntries];
    this.saveMoodDiaryEntries(nextEntries);
    return newEntry;
  },

  updateMoodDiaryAdminReply(
    entryId: string,
    customAdminReply: string
  ): MoodDiaryEntry[] {
    const current = this.getMoodDiaryEntries();
    const nextEntries = current.map((entry) =>
      entry.id === entryId
        ? { ...entry, customAdminReply: customAdminReply.trim() }
        : entry
    );
    this.saveMoodDiaryEntries(nextEntries);
    return nextEntries;
  },

  deleteMoodDiaryEntry(entryId: string): MoodDiaryEntry[] {
    const current = this.getMoodDiaryEntries();
    const nextEntries = current.filter((entry) => entry.id !== entryId);
    this.saveMoodDiaryEntries(nextEntries);
    return nextEntries;
  },
};

// Extract 11-character YouTube video ID from any youtube.com / youtu.be link
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

// Extract clean URL from either a raw URL or a pasted <iframe src="..."> snippet
export function extractIframeSrc(input: string): string {
  const trimmed = input.trim();
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }
  return trimmed;
}

// Read an uploaded audio file (.mp3, .wav, .ogg, .m4a, .aac, .webm) as Data URL
export function readAudioFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Không thể đọc file âm thanh'));
    reader.readAsDataURL(file);
  });
}

// Gentle warm chime for stress-relief mini-games
export function playGentleGameChime(freq = 587.33): void {
  if (typeof window === 'undefined') return;
  try {
    const sfxMuted = localStorage.getItem('gnqa_sfx_muted') === 'true';
    if (sfxMuted) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedPaperAudioCtx || sharedPaperAudioCtx.state === 'closed') {
      sharedPaperAudioCtx = new AudioCtx();
    }
    const ctx = sharedPaperAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 1.25,
      ctx.currentTime + 0.18
    );

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context restrictions
  }
}

// Subtle synthesized paper-flip sound effect using Web Audio API (zero external MP3 latency)
let sharedPaperAudioCtx: AudioContext | null = null;

export function playPaperFlipSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const sfxMuted = localStorage.getItem('gnqa_sfx_muted') === 'true';
    if (sfxMuted) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedPaperAudioCtx || sharedPaperAudioCtx.state === 'closed') {
      sharedPaperAudioCtx = new AudioCtx();
    }
    const ctx = sharedPaperAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const duration = 0.16;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      const envelope = Math.sin(progress * Math.PI) * Math.pow(1 - progress, 1.4);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.18;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + duration);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

// Smart client-side image compression (ObjectURL + high-sharpness WebP with JPEG fallback)
export async function compressImageFile(
  file: File,
  maxDimension = 1080,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl =
      typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(file)
        : '';

    const processImage = (img: HTMLImageElement) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      const canvas = document.createElement('canvas');
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Không thể khởi tạo bộ xử lý ảnh'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for 40-55% smaller payload at the same crisp visual quality
      let compressedDataUrl = canvas.toDataURL('image/webp', quality);
      if (!compressedDataUrl.startsWith('data:image/webp')) {
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(compressedDataUrl);
    };

    const img = new window.Image();
    img.onload = () => processImage(img);
    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Không thể đọc định dạng ảnh'));
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file ảnh'));
      reader.readAsDataURL(file);
    }
  });
}
