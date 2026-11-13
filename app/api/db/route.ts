import { NextRequest, NextResponse } from 'next/server';
import { readServerDb, writeServerDb } from '@/lib/server-db';
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
} from '@/lib/types';

export async function GET(req: NextRequest) {
  const db = readServerDb();
  const sinceParam = req.nextUrl.searchParams.get('since');
  if (sinceParam) {
    const since = Number(sinceParam);
    if (!Number.isNaN(since) && since > 0 && db.updatedAt <= since) {
      return NextResponse.json(
        { unchanged: true, updatedAt: db.updatedAt },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }
  return NextResponse.json(db, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = readServerDb();

    if (action === 'save_photo') {
      const photo = payload as PolaroidPhoto;
      const exists = db.photos.some((p) => p.id === photo.id);
      const updatedPhotos = exists
        ? db.photos.map((p) => (p.id === photo.id ? photo : p))
        : [photo, ...db.photos];
      const next = writeServerDb({ ...db, photos: updatedPhotos });
      return NextResponse.json({ ok: true, photos: next.photos });
    }

    if (action === 'set_featured_photo') {
      const { photoId } = payload as { photoId: string };
      const target = db.photos.find((p) => p.id === photoId);
      if (target) {
        const updatedPhotos = [
          { ...target, featured: true },
          ...db.photos.filter((p) => p.id !== photoId).map((p) => ({ ...p, featured: false })),
        ];
        const next = writeServerDb({ ...db, photos: updatedPhotos });
        return NextResponse.json({ ok: true, photos: next.photos });
      }
      return NextResponse.json({ ok: true, photos: db.photos });
    }

    if (action === 'sync_photos') {
      const photos = payload as PolaroidPhoto[];
      const next = writeServerDb({ ...db, photos });
      return NextResponse.json({ ok: true, photos: next.photos });
    }

    if (action === 'delete_photo') {
      const { photoId } = payload as { photoId: string };
      const updatedPhotos = db.photos.filter((p) => p.id !== photoId);
      const next = writeServerDb({ ...db, photos: updatedPhotos });
      return NextResponse.json({ ok: true, photos: next.photos });
    }

    if (action === 'save_mood_jars') {
      const jars = payload as MoodJarItem[];
      const next = writeServerDb({ ...db, moodJars: jars });
      return NextResponse.json({ ok: true, moodJars: next.moodJars });
    }

    if (action === 'add_wish') {
      const wish = payload as WishEntry;
      const updatedWishes = [wish, ...db.wishes];
      const next = writeServerDb({ ...db, wishes: updatedWishes });
      return NextResponse.json({ ok: true, wishes: next.wishes });
    }

    if (action === 'update_wishes') {
      const wishes = payload as WishEntry[];
      const next = writeServerDb({ ...db, wishes });
      return NextResponse.json({ ok: true, wishes: next.wishes });
    }

    if (action === 'save_settings') {
      const settings = payload as AppSettings;
      const next = writeServerDb({ ...db, settings });
      return NextResponse.json({ ok: true, settings: next.settings });
    }

    if (action === 'save_music_tracks') {
      const musicTracks = payload as MusicTrackItem[];
      const next = writeServerDb({ ...db, musicTracks });
      return NextResponse.json({ ok: true, musicTracks: next.musicTracks });
    }

    if (action === 'append_music_tracks') {
      const incoming = payload as MusicTrackItem[];
      const existingIds = new Set(db.musicTracks.map((t) => t.id));
      const uniqueIncoming = incoming.filter((t) => !existingIds.has(t.id));
      const merged = [...uniqueIncoming, ...db.musicTracks];
      const next = writeServerDb({ ...db, musicTracks: merged });
      return NextResponse.json({ ok: true, musicTracks: next.musicTracks });
    }

    if (action === 'save_external_games') {
      const externalGames = payload as ExternalGameItem[];
      const next = writeServerDb({ ...db, externalGames });
      return NextResponse.json({ ok: true, externalGames: next.externalGames });
    }

    if (action === 'save_mood_diary_entries') {
      const moodDiaryEntries = payload as MoodDiaryEntry[];
      const next = writeServerDb({ ...db, moodDiaryEntries });
      return NextResponse.json({
        ok: true,
        moodDiaryEntries: next.moodDiaryEntries,
      });
    }

    if (action === 'save_mood_preset_config') {
      const moodPresetConfig = payload as MoodPresetConfig;
      const next = writeServerDb({ ...db, moodPresetConfig });
      return NextResponse.json({
        ok: true,
        moodPresetConfig: next.moodPresetConfig,
      });
    }

    if (action === 'save_companion_memories') {
      const companionMemories = payload as CompanionMemoryItem[];
      const next = writeServerDb({ ...db, companionMemories });
      return NextResponse.json({
        ok: true,
        companionMemories: next.companionMemories,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
