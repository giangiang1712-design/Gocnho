'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloudRain,
  Disc3,
  ListMusic,
  MoonStar,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Youtube,
} from 'lucide-react';
import { extractYouTubeId, playPaperFlipSound } from '@/lib/data-service';
import type { MusicTargetSection, MusicTrackItem } from '@/lib/types';

type SoundscapeMode = 'musicbox' | 'piano' | 'rain' | 'night';
type LoopMode = 'all' | 'one' | 'off';

interface AmbientAudioToggleProps {
  musicTracks?: MusicTrackItem[];
  activeSection?: MusicTargetSection;
  senderAlias?: string;
}

const SECTION_LABELS: Record<MusicTargetSection, string> = {
  all: 'Toàn bộ sổ',
  page_01: 'Trang 01 · Bìa Sổ',
  page_02: 'Trang 02 · Polaroid',
  page_03: 'Trang 03 · Hũ Kẹo',
  minigame: 'Góc Giải Khuây',
};

const SOUNDSCAPE_MODES: {
  id: SoundscapeMode;
  label: string;
  desc: string;
  Icon: typeof Music;
}[] = [
  {
    id: 'musicbox',
    label: 'Hộp Nhạc Dịu Êm',
    desc: 'Giai điệu phím đàn ấm áp',
    Icon: Music,
  },
  {
    id: 'piano',
    label: 'Đàn Piano Chiều Mưa',
    desc: 'Hợp âm rải dịu nhẹ chữa lành',
    Icon: Sparkles,
  },
  {
    id: 'rain',
    label: 'Mưa Rơi Bên Hiên',
    desc: 'Tiếng mưa chiều thư thái',
    Icon: CloudRain,
  },
  {
    id: 'night',
    label: 'Đêm Tĩnh Lặng',
    desc: 'Hòa âm sâu lắng dịu mắt',
    Icon: MoonStar,
  },
];

const LOOP_MODE_LABELS: Record<LoopMode, string> = {
  all: 'Đang lặp vô hạn',
  one: 'Lặp lại 1 bản nhạc',
  off: 'Không lặp lại',
};

function playMusicBoxChord(ctx: AudioContext) {
  const progressions = [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [233.08, 293.66, 349.23, 440.0], // Bbmaj7
    [261.63, 329.63, 392.0, 523.25], // C6
  ];
  const chord = progressions[Math.floor(Math.random() * progressions.length)];

  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startTime = ctx.currentTime + idx * 0.28;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.025, startTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 3.3);
  });
}

function playWarmPianoArpeggio(ctx: AudioContext, stepIdx: number) {
  const bars = [
    [261.63, 329.63, 392.0, 493.88, 523.25], // Cmaj7
    [220.0, 261.63, 329.63, 392.0, 440.0],   // Am7
    [174.61, 220.0, 261.63, 329.63, 349.23], // Fmaj7
    [196.0, 246.94, 293.66, 349.23, 392.0],  // G6
  ];
  const notes = bars[stepIdx % bars.length];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    subOsc.type = 'sine';

    const startTime = ctx.currentTime + idx * 0.36;
    osc.frequency.setValueAtTime(freq, startTime);
    subOsc.frequency.setValueAtTime(freq * 2, startTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.18, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.024, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.008, startTime + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.6);

    osc.connect(gain);
    subOsc.connect(subGain);
    subGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    subOsc.start(startTime);
    osc.stop(startTime + 3.7);
    subOsc.stop(startTime + 3.7);
  });
}

function playNightPadChord(ctx: AudioContext) {
  const padNotes = [
    [174.61, 261.63, 349.23, 440.0],
    [146.83, 220.0, 293.66, 440.0],
  ];
  const notes = padNotes[Math.floor(Math.random() * padNotes.length)];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const start = ctx.currentTime + idx * 0.4;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.018, start + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 4.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 4.5);
  });
}

function createRainSource(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    output[i] = (b0 + b1 + b2 + white * 0.015) * 0.14;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = buffer;
  whiteNoise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(880, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 1.0);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  whiteNoise.start();
  return whiteNoise;
}

export default function AmbientAudioToggle({
  musicTracks = [],
  activeSection = 'page_01',
}: AmbientAudioToggleProps) {
  const [manualPlaying, setManualPlaying] = useState(false);
  const [mode, setMode] = useState<SoundscapeMode>('musicbox');
  const [loopMode, setLoopMode] = useState<LoopMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gnqa_music_loop_mode');
      if (saved === 'all' || saved === 'one' || saved === 'off') {
        return saved;
      }
    }
    return 'all';
  });
  const [selectedTrackBySection, setSelectedTrackBySection] = useState<
    Record<string, string | null>
  >({});
  const [userPausedManually, setUserPausedManually] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gnqa_sfx_muted') !== 'true';
    }
    return true;
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const rainSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const pianoStepRef = useRef(0);

  // Build ordered Playlist for the current activeSection
  const sectionSpecificTracks = musicTracks.filter(
    (t) => t.targetSection === activeSection
  );
  const globalTracks = musicTracks.filter((t) => t.targetSection === 'all');
  const baseSectionPlaylist =
    sectionSpecificTracks.length > 0 ? sectionSpecificTracks : globalTracks;

  // Put autoPlay tracks first while preserving Admin's playlist order within each group
  const sectionPlaylist = [...baseSectionPlaylist].sort(
    (a, b) => Number(Boolean(b.autoPlay)) - Number(Boolean(a.autoPlay))
  );

  const sectionSelectedId = selectedTrackBySection[activeSection];
  const explicitTrack =
    sectionSelectedId && sectionSelectedId !== '__soundscape__'
      ? musicTracks.find((t) => t.id === sectionSelectedId) || null
      : null;

  const autoStartTrack =
    sectionSelectedId === '__soundscape__'
      ? null
      : sectionPlaylist.find((t) => t.autoPlay) || null;

  const activeTrack = explicitTrack || autoStartTrack;

  const currentPlaylist =
    activeTrack && sectionPlaylist.some((t) => t.id === activeTrack.id)
      ? sectionPlaylist
      : sectionPlaylist.length > 0
        ? sectionPlaylist
        : musicTracks;

  const currentTrackIndex = activeTrack
    ? currentPlaylist.findIndex((t) => t.id === activeTrack.id)
    : -1;

  const isPlaying =
    !userPausedManually && (Boolean(activeTrack) || manualPlaying);

  const stopProceduralAudio = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rainSourceRef.current) {
      try {
        rainSourceRef.current.stop();
      } catch {
        // Ignore
      }
      rainSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const stopHtmlAudio = () => {
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }
  };

  const stopAllAudio = () => {
    stopProceduralAudio();
    stopHtmlAudio();
  };

  const cycleLoopMode = () => {
    const order: LoopMode[] = ['all', 'one', 'off'];
    const next = order[(order.indexOf(loopMode) + 1) % order.length];
    setLoopMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gnqa_music_loop_mode', next);
    }
  };

  const startProceduralSoundscape = (targetMode: SoundscapeMode) => {
    stopAllAudio();
    setSelectedTrackBySection((prev) => ({
      ...prev,
      [activeSection]: '__soundscape__',
    }));
    setUserPausedManually(false);
    setManualPlaying(true);

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    if (targetMode === 'musicbox') {
      playMusicBoxChord(ctx);
      intervalRef.current = window.setInterval(() => {
        if (loopMode === 'off') {
          stopProceduralAudio();
          setManualPlaying(false);
          return;
        }
        playMusicBoxChord(ctx);
      }, 4200);
    } else if (targetMode === 'piano') {
      pianoStepRef.current = 0;
      playWarmPianoArpeggio(ctx, pianoStepRef.current);
      intervalRef.current = window.setInterval(() => {
        pianoStepRef.current += 1;
        if (loopMode === 'off' && pianoStepRef.current >= 4) {
          stopProceduralAudio();
          setManualPlaying(false);
          return;
        }
        playWarmPianoArpeggio(ctx, pianoStepRef.current);
      }, 3600);
    } else if (targetMode === 'rain') {
      rainSourceRef.current = createRainSource(ctx);
      playMusicBoxChord(ctx);
      intervalRef.current = window.setInterval(() => {
        if (loopMode === 'off') {
          stopProceduralAudio();
          setManualPlaying(false);
          return;
        }
        playMusicBoxChord(ctx);
      }, 6200);
    } else {
      playNightPadChord(ctx);
      intervalRef.current = window.setInterval(() => {
        if (loopMode === 'off') {
          stopProceduralAudio();
          setManualPlaying(false);
          return;
        }
        playNightPadChord(ctx);
      }, 4800);
    }
  };

  const playCustomTrack = (track: MusicTrackItem) => {
    stopProceduralAudio();
    setSelectedTrackBySection((prev) => ({
      ...prev,
      [activeSection]: track.id,
    }));
    setManualPlaying(true);
    setUserPausedManually(false);

    if (track.sourceType !== 'youtube' && htmlAudioRef.current) {
      htmlAudioRef.current.src = track.url;
      htmlAudioRef.current.loop =
        loopMode === 'one' || (loopMode === 'all' && currentPlaylist.length <= 1);
      htmlAudioRef.current.play().catch(() => {});
    } else {
      stopHtmlAudio();
    }
  };

  const handleStepPlaylist = (step: 1 | -1) => {
    if (currentPlaylist.length === 0) return;
    const baseIdx = currentTrackIndex >= 0 ? currentTrackIndex : 0;
    const nextIdx =
      (baseIdx + step + currentPlaylist.length) % currentPlaylist.length;
    const targetTrack = currentPlaylist[nextIdx];
    if (targetTrack) {
      playCustomTrack(targetTrack);
    }
  };

  // Sync external HTML5 <audio> element when activeTrack, loopMode, or isPlaying changes
  const activeTrackId = activeTrack?.id || '';
  const activeTrackUrl = activeTrack?.url || '';
  const activeTrackSource = activeTrack?.sourceType || '';
  const shouldLoopNativeAudio =
    loopMode === 'one' || (loopMode === 'all' && currentPlaylist.length <= 1);

  useEffect(() => {
    const audioEl = htmlAudioRef.current;
    if (!audioEl) return;

    if (!isPlaying || !activeTrackId || activeTrackSource === 'youtube') {
      audioEl.pause();
      return;
    }

    stopProceduralAudio();
    if (audioEl.src !== activeTrackUrl) {
      audioEl.src = activeTrackUrl;
    }
    audioEl.loop = shouldLoopNativeAudio;
    audioEl.play().catch(() => {
      // Browser autoplay policy may wait for next interaction
    });
  }, [
    isPlaying,
    activeTrackId,
    activeTrackUrl,
    activeTrackSource,
    shouldLoopNativeAudio,
  ]);

  const toggleMusic = () => {
    if (isPlaying) {
      stopAllAudio();
      setManualPlaying(false);
      setUserPausedManually(true);
    } else {
      setUserPausedManually(false);
      if (activeTrack) {
        playCustomTrack(activeTrack);
      } else {
        const fallbackTrack =
          sectionPlaylist[0] ||
          musicTracks.find((t) => t.targetSection === activeSection) ||
          musicTracks.find((t) => t.targetSection === 'all') ||
          musicTracks[0];
        if (fallbackTrack) {
          playCustomTrack(fallbackTrack);
        } else {
          startProceduralSoundscape(mode);
        }
      }
    }
  };

  const handleSelectMode = (nextMode: SoundscapeMode) => {
    setMode(nextMode);
    startProceduralSoundscape(nextMode);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gnqa_sfx_muted', next ? 'false' : 'true');
      if (next) {
        playPaperFlipSound();
      }
    }
  };

  useEffect(() => {
    const htmlAudio = htmlAudioRef.current;
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (rainSourceRef.current) {
        try {
          rainSourceRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (htmlAudio) {
        htmlAudio.pause();
      }
    };
  }, []);

  const currentModeObj =
    SOUNDSCAPE_MODES.find((m) => m.id === mode) || SOUNDSCAPE_MODES[0];

  const activeYoutubeId =
    activeTrack?.sourceType === 'youtube'
      ? activeTrack.youtubeId || extractYouTubeId(activeTrack.url)
      : null;

  const buttonLabel = isPlaying
    ? activeTrack
      ? activeTrack.title
      : currentModeObj.label
    : activeTrack
      ? `Phát: ${activeTrack.title}`
      : 'Giai Điệu Êm Dịu';

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Hidden HTML5 Audio Element for MP3 / WAV / OGG / M4A / Uploaded Audio with Loop & Playlist Auto-Advance */}
      <audio
        ref={htmlAudioRef}
        className="hidden"
        preload="auto"
        onEnded={() => {
          if (loopMode === 'all' && currentPlaylist.length > 1) {
            handleStepPlaylist(1);
          } else if (loopMode === 'off') {
            setManualPlaying(false);
            setUserPausedManually(true);
          }
        }}
      />

      {/* Persistent Hidden/Mini YouTube Player when YouTube track is active and playing */}
      {isPlaying && activeYoutubeId && !isMenuOpen && (
        <div className="w-0 h-0 overflow-hidden pointer-events-none absolute opacity-0">
          <iframe
            src={
              loopMode !== 'off'
                ? `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&loop=1&playlist=${activeYoutubeId}`
                : `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1`
            }
            title={activeTrack?.title || 'YouTube Audio'}
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={toggleMusic}
          title={isPlaying ? 'Tạm dừng âm nhạc' : 'Bật giai điệu chữa lành'}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-medium border backdrop-blur-md transition-colors cursor-pointer max-w-[126px] min-[390px]:max-w-[155px] sm:max-w-[195px] shrink-0 ${
            isPlaying
              ? 'bg-[#FFF0F3]/90 dark:bg-[#3D2830]/90 text-[#D95B72] dark:text-[#FF9EB0] border-[#FFB3C1] dark:border-[#6A4A56] shadow-2xs'
              : 'bg-white/85 dark:bg-[#2A1F24]/85 text-[#7D6B6D] dark:text-[#C7B0B7] border-[#F3D1DC] dark:border-[#533D45] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
          }`}
        >
          {isPlaying ? (
            <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-[#FF8FA3] to-[#FFB3C1] dark:from-[#E06D82] dark:to-[#FF9EB0] text-white shadow-2xs shrink-0">
              <Disc3 className="w-3.5 h-3.5 animate-spin" />
            </span>
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#7D6B6D] dark:text-[#C7B0B7] shrink-0" />
          )}
          <span className="truncate">{buttonLabel}</span>
          {currentPlaylist.length > 1 && activeTrack && (
            <span className="text-[10px] text-[#D95B72]/80 dark:text-[#FF9EB0]/85 tabular-nums shrink-0">
              {currentTrackIndex + 1}/{currentPlaylist.length}
            </span>
          )}
        </button>
      </div>

      {/* Explicit Loop Mode Toggle Button (All / One / Off) - shown inline on sm+, accessible inside popover on mobile */}
      <button
        type="button"
        onClick={cycleLoopMode}
        title={`Chế độ lặp: ${LOOP_MODE_LABELS[loopMode]} (Bấm để đổi)`}
        aria-label={`Chế độ lặp: ${LOOP_MODE_LABELS[loopMode]}`}
        className={`hidden sm:inline-flex items-center justify-center p-2 rounded-xl border backdrop-blur-md text-xs transition-colors cursor-pointer shrink-0 ${
          loopMode !== 'off'
            ? 'bg-[#FFF0F3]/90 dark:bg-[#3D2830]/90 text-[#D95B72] dark:text-[#FF9EB0] border-[#FFB3C1] dark:border-[#6A4A56]'
            : 'bg-white/85 dark:bg-[#2A1F24]/85 text-[#9B898B] dark:text-[#9A8189] border-[#F3D1DC] dark:border-[#533D45] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
        }`}
      >
        {loopMode === 'one' ? (
          <Repeat1 className="w-3.5 h-3.5" />
        ) : (
          <Repeat className="w-3.5 h-3.5" />
        )}
      </button>

      {currentPlaylist.length > 1 && (
        <div className="hidden sm:inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleStepPlaylist(-1)}
            title="Bài trước trong Playlist"
            aria-label="Bài trước trong Playlist"
            className="p-1.5 rounded-lg bg-white/85 dark:bg-[#2A1F24]/85 backdrop-blur-md border border-[#F3D1DC] dark:border-[#533D45] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#D95B72] dark:hover:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleStepPlaylist(1)}
            title="Bài tiếp theo trong Playlist"
            aria-label="Bài tiếp theo trong Playlist"
            className="p-1.5 rounded-lg bg-white/85 dark:bg-[#2A1F24]/85 backdrop-blur-md border border-[#F3D1DC] dark:border-[#533D45] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#D95B72] dark:hover:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        title="Chọn bài hát & không gian âm thanh"
        aria-label="Chọn không gian âm thanh"
        aria-expanded={isMenuOpen}
        className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl border backdrop-blur-md text-xs transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 ${
          isMenuOpen
            ? 'bg-[#FFF0F3]/90 dark:bg-[#3D2830]/90 text-[#D95B72] dark:text-[#FF9EB0] border-[#FFB3C1] dark:border-[#6A4A56]'
            : 'bg-white/85 dark:bg-[#2A1F24]/85 text-[#7D6B6D] dark:text-[#C7B0B7] border-[#F3D1DC] dark:border-[#533D45] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
        }`}
      >
        <Sliders className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[calc(4.75rem+env(safe-area-inset-top))] sm:top-full sm:mt-2 sm:w-84 max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto rounded-2xl bg-white/95 dark:bg-[#271D21]/95 backdrop-blur-xl border border-[#F3D1DC] dark:border-[#533D45] shadow-[0_16px_42px_rgba(74,59,62,0.22)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-3.5 z-50"
          >
            {/* Custom Playlist from Admin */}
            {musicTracks.length > 0 && (
              <div className="mb-3 pb-3 border-b border-[#F7E4EA] dark:border-[#4A363D]">
                <div className="text-[11px] font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] px-1.5 py-1 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <ListMusic className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0" />
                    <span className="truncate">
                      Playlist {SECTION_LABELS[activeSection]} ({currentPlaylist.length})
                    </span>
                  </span>
                  {currentPlaylist.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStepPlaylist(-1)}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#D95B72] dark:hover:text-[#FF9EB0] cursor-pointer inline-flex items-center justify-center"
                        title="Bài trước"
                      >
                        <SkipBack className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepPlaylist(1)}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#D95B72] dark:hover:text-[#FF9EB0] cursor-pointer inline-flex items-center justify-center"
                        title="Bài tiếp"
                      >
                        <SkipForward className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-1 space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {musicTracks.map((track) => {
                    const isTrackActive =
                      activeTrack?.id === track.id && isPlaying;
                    const matchesCurrentSection =
                      track.targetSection === activeSection ||
                      track.targetSection === 'all';
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => playCustomTrack(track)}
                        className={`w-full min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isTrackActive
                            ? 'bg-[#FFF0F3] dark:bg-[#3D2830] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56]'
                            : matchesCurrentSection
                              ? 'bg-[#FFFDF9]/90 dark:bg-[#22191D]/90 hover:bg-[#FFF0F3]/60 dark:hover:bg-[#3A2930] text-[#4A3B3E] dark:text-[#F6EAEF] border border-[#F7E4EA] dark:border-[#4A363D]'
                              : 'hover:bg-[#FFFDF9] dark:hover:bg-[#2A1F24] text-[#7D6B6D] dark:text-[#C7B0B7] border border-transparent'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#FFF0F3] dark:bg-[#3A2930] flex items-center justify-center shrink-0">
                          {track.sourceType === 'youtube' ? (
                            <Youtube className="w-3.5 h-3.5 text-[#FF6B88] dark:text-[#FF9EB0]" />
                          ) : isTrackActive ? (
                            <Pause className="w-3.5 h-3.5 text-[#D95B72] dark:text-[#FF9EB0]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-[#FF8FA3]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">
                            {track.title}
                          </div>
                          <div className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] truncate flex items-center gap-1">
                            <span>{SECTION_LABELS[track.targetSection]}</span>
                            {track.artistOrNote && (
                              <>
                                <span>·</span>
                                <span className="truncate">
                                  {track.artistOrNote}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Visible Compact YouTube Embed when popover is open */}
                {activeYoutubeId && isPlaying && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-[#F3D1DC] dark:border-[#533D45] bg-[#FAF7F2] dark:bg-[#1E161A] h-28">
                    <iframe
                      src={
                        loopMode !== 'off'
                          ? `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&loop=1&playlist=${activeYoutubeId}`
                          : `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1`
                      }
                      title={activeTrack?.title || 'YouTube Mini Player'}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] px-1.5 py-1 flex items-center justify-between">
              <span>Nhạc Không Lời Chữa Lành</span>
              <Sparkles className="w-3 h-3 text-[#FF8FA3]" />
            </div>

            <div className="mt-1 space-y-1">
              {SOUNDSCAPE_MODES.map((item) => {
                const IconComp = item.Icon;
                const active =
                  !activeTrack && mode === item.id && isPlaying;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMode(item.id)}
                    className={`w-full min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#FFF0F3] dark:bg-[#3D2830] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56]'
                        : 'hover:bg-[#FFFDF9] dark:hover:bg-[#33252B] text-[#4A3B3E] dark:text-[#F6EAEF]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#FFF0F3] dark:bg-[#3A2930] flex items-center justify-center shrink-0">
                      <IconComp className="w-3.5 h-3.5 text-[#FF8FA3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] truncate">
                        {item.desc}
                      </div>
                    </div>
                    {active && (
                      <Volume2 className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loop Mode Switcher inside Drawer */}
            <div className="mt-2.5 pt-2.5 border-t border-[#F7E4EA] dark:border-[#4A363D] px-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                Chế độ lặp nhạc nền
              </span>
              <button
                type="button"
                onClick={cycleLoopMode}
                className={`min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  loopMode !== 'off'
                    ? 'bg-[#FFF0F3] dark:bg-[#3D2830] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56]'
                    : 'bg-[#FAF7F2] dark:bg-[#1E161A] text-[#7D6B6D] dark:text-[#C7B0B7]'
                }`}
              >
                {loopMode === 'one' ? (
                  <Repeat1 className="w-3 h-3" />
                ) : (
                  <Repeat className="w-3 h-3" />
                )}
                <span>{LOOP_MODE_LABELS[loopMode]}</span>
              </button>
            </div>

            <div className="mt-2 pt-2 border-t border-[#F7E4EA] dark:border-[#4A363D] px-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                Tiếng sột soạt lật giấy
              </span>
              <button
                type="button"
                onClick={handleToggleSfx}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  sfxEnabled
                    ? 'bg-[#FFF0F3] dark:bg-[#3D2830] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56]'
                    : 'bg-[#FAF7F2] dark:bg-[#1E161A] text-[#7D6B6D] dark:text-[#C7B0B7]'
                }`}
              >
                {sfxEnabled ? 'Đang Bật' : 'Đã Tắt'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
