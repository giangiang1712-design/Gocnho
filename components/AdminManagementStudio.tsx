'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  BookHeart,
  Camera,
  Check,
  Eye,
  FileAudio,
  Gamepad2,
  Heart,
  ImagePlus,
  Link2,
  ListMusic,
  Lock,
  LogOut,
  MessageSquareHeart,
  Moon,
  Music,
  Plus,
  Save,
  Settings,
  Smile,
  Sparkles,
  Star,
  StickyNote,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  compressImageFile,
  DataService,
  DEFAULT_MOOD_PRESET_CONFIG,
  extractIframeSrc,
  extractYouTubeId,
  INITIAL_MOOD_DIARY_ENTRIES,
  MOOD_DIARY_EMOTIONS,
  readAudioFileAsDataUrl,
} from '@/lib/data-service';
import type {
  AppSettings,
  ExternalGameItem,
  MoodDiaryEmotion,
  MoodDiaryEntry,
  MoodJarItem,
  MoodPresetConfig,
  MusicSourceType,
  MusicTargetSection,
  MusicTrackItem,
  PolaroidPhoto,
  UserSession,
  WishEntry,
} from '@/lib/types';

interface AdminManagementStudioProps {
  session: UserSession;
  photos: PolaroidPhoto[];
  onPhotosChange: (updated: PolaroidPhoto[]) => void;
  moodJars: MoodJarItem[];
  onMoodJarsChange: (updated: MoodJarItem[]) => void;
  wishes?: WishEntry[];
  onWishesChange?: (updated: WishEntry[]) => void;
  moodDiaryEntries?: MoodDiaryEntry[];
  onMoodDiaryEntriesChange?: (updated: MoodDiaryEntry[]) => void;
  moodPresetConfig?: MoodPresetConfig;
  onMoodPresetConfigChange?: (updated: MoodPresetConfig) => void;
  musicTracks: MusicTrackItem[];
  onMusicTracksChange: (updated: MusicTrackItem[]) => void;
  externalGames: ExternalGameItem[];
  onExternalGamesChange: (updated: ExternalGameItem[]) => void;
  settings: AppSettings;
  onSettingsChange: (updated: AppSettings) => void;
  isCandlelightMode?: boolean;
  onToggleCandlelight?: () => void;
  onTogglePreview: () => void;
  onLogout: () => void;
}

const EMOTION_TAGS = [
  '#NụCườiToảNắng',
  '#NgàyDịuDàng',
  '#GócBìnhYên',
  '#TrongTrẻo',
  '#KhoảnhKhắcĐẹp',
];

const MUSIC_SECTION_OPTIONS: { value: MusicTargetSection; label: string }[] = [
  { value: 'all', label: 'Toàn bộ sổ lưu niệm (Phát xuyên suốt)' },
  { value: 'page_01', label: 'Trang 01 · Bìa Sổ & Lời Tựa' },
  { value: 'page_02', label: 'Trang 02 · Tường Ảnh Polaroid' },
  { value: 'page_03', label: 'Trang 03 · Hũ Kẹo & Hộp Thư Nhỏ' },
  { value: 'minigame', label: 'Góc Nhỏ Giải Khuây (Khi mở Mini-Game)' },
];

export default function AdminManagementStudio({
  photos,
  onPhotosChange,
  moodJars,
  onMoodJarsChange,
  wishes = [],
  onWishesChange,
  moodDiaryEntries = INITIAL_MOOD_DIARY_ENTRIES,
  onMoodDiaryEntriesChange,
  moodPresetConfig = DEFAULT_MOOD_PRESET_CONFIG,
  onMoodPresetConfigChange,
  musicTracks,
  onMusicTracksChange,
  externalGames,
  onExternalGamesChange,
  settings,
  onSettingsChange,
  isCandlelightMode = false,
  onToggleCandlelight,
  onTogglePreview,
  onLogout,
}: AdminManagementStudioProps) {
  const [activeTab, setActiveTab] = useState<
    'photos' | 'diary' | 'jars' | 'wishes' | 'music' | 'games' | 'settings'
  >('photos');
  const [wishReplyDrafts, setWishReplyDrafts] = useState<Record<string, string>>(
    {}
  );
  const [wishPlanDrafts, setWishPlanDrafts] = useState<Record<string, string>>(
    {}
  );
  const [wishFilter, setWishFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [diaryReplyDrafts, setDiaryReplyDrafts] = useState<
    Record<string, string>
  >({});
  const [selectedPresetEmotion, setSelectedPresetEmotion] =
    useState<MoodDiaryEmotion>('radiant');
  const [newPresetMsg, setNewPresetMsg] = useState('');
  const idSeqRef = useRef(1000);

  // Photo state
  const [selectedJarId, setSelectedJarId] = useState<string>(
    moodJars[0]?.id || 'jar-happy'
  );
  const [newJarMsg, setNewJarMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Quick batch upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const [newCaption, setNewCaption] = useState('');
  const [newStory, setNewStory] = useState('');
  const [newSecretCaption, setNewSecretCaption] = useState('');
  const [newTag, setNewTag] = useState('#NụCườiToảNắng');
  const [newDate, setNewDate] = useState('Hôm nay');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editable photo drafts mapping
  const [photoDrafts, setPhotoDrafts] = useState<
    Record<string, Partial<PolaroidPhoto>>
  >({});

  // Custom Music Manager form state
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [musicSourceType, setMusicSourceType] =
    useState<MusicSourceType>('youtube');
  const [musicUrlInput, setMusicUrlInput] = useState('');
  const [musicUploadedDataUrl, setMusicUploadedDataUrl] = useState('');
  const [musicUploadedFileName, setMusicUploadedFileName] = useState('');
  const [pendingUploadedFiles, setPendingUploadedFiles] = useState<
    { fileName: string; title: string; dataUrl: string; formatLabel: string }[]
  >([]);
  const [musicSectionFilter, setMusicSectionFilter] = useState<
    'all_filter' | MusicTargetSection
  >('all_filter');
  const [musicFormatLabel, setMusicFormatLabel] = useState('YouTube');
  const [musicTargetSection, setMusicTargetSection] =
    useState<MusicTargetSection>('all');
  const [musicIsAutoPlay, setMusicIsAutoPlay] = useState(true);
  const [isReadingAudioFile, setIsReadingAudioFile] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // External Mini-Game Manager form state
  const [gameTitle, setGameTitle] = useState('');
  const [gameSubtitle, setGameSubtitle] = useState('');
  const [gameCategory, setGameCategory] = useState('Giải tỏa căng thẳng');
  const [gameEmbedInput, setGameEmbedInput] = useState('');

  // Settings form state
  const [aliasInput, setAliasInput] = useState(settings.senderAlias || 'X');
  const [herNameInput, setHerNameInput] = useState(
    settings.herNickname || 'Quỳnh Anh'
  );
  const [welcomeInput, setWelcomeInput] = useState(settings.welcomeNote || '');
  const [footerInput, setFooterInput] = useState(
    settings.secretHeaderNote || ''
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  // Upload handler for photos
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const dataUrls: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file);
          dataUrls.push(compressed);
        }
      }
      setUploadFiles((prev) => [...prev, ...dataUrls]);
    } catch {
      showToast('Có lỗi khi đọc file ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    const added: PolaroidPhoto[] = [];
    for (let i = 0; i < uploadFiles.length; i++) {
      idSeqRef.current += 1;
      const now = Date.now();
      const item: PolaroidPhoto = {
        id: `polaroid-${now}-${idSeqRef.current}-${i}`,
        imageUrl: uploadFiles[i],
        caption:
          newCaption.trim() ||
          `Thêm một khoảnh khắc thật xinh của ${settings.herNickname} được lưu lại.`,
        story:
          newStory.trim() ||
          `Mỗi khoảnh khắc ở đây đều lưu giữ năng lượng trong trẻo và đáng quý nhất của ${settings.herNickname}.`,
        secretCaption: newSecretCaption.trim() || undefined,
        date: newDate.trim() || 'Hôm nay',
        emotionTag: newTag,
        likes: 1,
        isLiked: true,
        rotation: (i % 2 === 0 ? -1 : 1) * 1.2,
        createdAt: now + i,
      };
      const saved = await DataService.savePhoto(item);
      added.push(saved);
    }

    const nextList = [...added.reverse(), ...photos];
    onPhotosChange(nextList);
    setUploadFiles([]);
    setNewCaption('');
    setNewStory('');
    setNewSecretCaption('');
    showToast(`Đã thêm ${added.length} bức ảnh mới vào kho lưu trữ!`);
  };

  // Inline photo editing handlers
  const handleDraftChange = (
    photoId: string,
    field: keyof PolaroidPhoto,
    val: string | boolean | number
  ) => {
    setPhotoDrafts((prev) => ({
      ...prev,
      [photoId]: {
        ...prev[photoId],
        [field]: val,
      },
    }));
  };

  const handleSavePhotoDraft = async (photo: PolaroidPhoto) => {
    const draft = photoDrafts[photo.id];
    if (!draft) {
      showToast('Không có thay đổi nào cần lưu.');
      return;
    }
    const updated: PolaroidPhoto = {
      ...photo,
      ...draft,
    };
    const nextList = photos.map((p) => (p.id === photo.id ? updated : p));
    onPhotosChange(nextList);
    await DataService.savePhoto(updated);

    setPhotoDrafts((prev) => {
      const copy = { ...prev };
      delete copy[photo.id];
      return copy;
    });
    showToast('Đã lưu thay đổi cho bức ảnh!');
  };

  const handleSetFeatured = async (photo: PolaroidPhoto) => {
    const updatedPhotos = await DataService.setFeaturedPhoto(photo.id);
    onPhotosChange(updatedPhotos);
    showToast('Đã đưa bức ảnh lên làm tiêu điểm đầu trang cho Quỳnh Anh!');
  };

  const handleDeletePhoto = async (photoId: string) => {
    const nextList = photos.filter((p) => p.id !== photoId);
    onPhotosChange(nextList);
    await DataService.deletePhoto(photoId);
    showToast('Đã xóa bức ảnh khỏi kho lưu trữ.');
  };

  // Mood Jar handlers
  const currentJar =
    moodJars.find((j) => j.id === selectedJarId) || moodJars[0];

  const handleUpdateJarSubtitle = (newSub: string) => {
    if (!currentJar) return;
    const updatedJars = moodJars.map((jar) =>
      jar.id === currentJar.id ? { ...jar, subtitle: newSub } : jar
    );
    onMoodJarsChange(updatedJars);
    DataService.saveMoodJars(updatedJars);
  };

  const handleUpdateJarMessage = (index: number, newText: string) => {
    if (!currentJar) return;
    const updatedMessages = [...currentJar.messages];
    updatedMessages[index] = newText;
    const updatedJars = moodJars.map((jar) =>
      jar.id === currentJar.id ? { ...jar, messages: updatedMessages } : jar
    );
    onMoodJarsChange(updatedJars);
    DataService.saveMoodJars(updatedJars);
  };

  const handleAddMessageToJar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJarMsg.trim() || !currentJar) return;

    const updatedJars = moodJars.map((jar) =>
      jar.id === currentJar.id
        ? { ...jar, messages: [newJarMsg.trim(), ...jar.messages] }
        : jar
    );
    onMoodJarsChange(updatedJars);
    DataService.saveMoodJars(updatedJars);
    setNewJarMsg('');
    showToast(`Đã thêm thông điệp mới vào ${currentJar.title}!`);
  };

  const handleDeleteJarMessage = (indexToDelete: number) => {
    if (!currentJar) return;
    const updatedMessages = currentJar.messages.filter(
      (_, idx) => idx !== indexToDelete
    );
    const updatedJars = moodJars.map((jar) =>
      jar.id === currentJar.id ? { ...jar, messages: updatedMessages } : jar
    );
    onMoodJarsChange(updatedJars);
    DataService.saveMoodJars(updatedJars);
    showToast('Đã xóa câu lời nhắn.');
  };

  // Custom Music Upload / Multi-Track Playlist Handlers
  const handleAudioFileSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsReadingAudioFile(true);
    try {
      const readItems: {
        fileName: string;
        title: string;
        dataUrl: string;
        formatLabel: string;
      }[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const dataUrl = await readAudioFileAsDataUrl(file);
        const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
        const formatLabel = [
          'MP3',
          'WAV',
          'OGG',
          'M4A',
          'AAC',
          'FLAC',
          'WEBM',
        ].includes(ext)
          ? ext
          : 'Audio File';
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        readItems.push({
          fileName: file.name,
          title: cleanName,
          dataUrl,
          formatLabel,
        });
      }

      if (readItems.length === 1) {
        const single = readItems[0];
        setPendingUploadedFiles((prev) => [...prev, single]);
        setMusicUploadedDataUrl(single.dataUrl);
        setMusicUploadedFileName(single.fileName);
        setMusicFormatLabel(single.formatLabel);
        if (!musicTitle.trim()) {
          setMusicTitle(single.title);
        }
        showToast(
          `Đã sẵn sàng ${single.fileName} (${single.formatLabel}). Bạn có thể chọn thêm file hoặc bấm thêm vào Playlist!`
        );
      } else if (readItems.length > 1) {
        setPendingUploadedFiles((prev) => [...prev, ...readItems]);
        setMusicUploadedDataUrl(readItems[0].dataUrl);
        setMusicUploadedFileName(
          `${readItems.length} file nhạc đã sẵn sàng cho Playlist`
        );
        setMusicFormatLabel('Playlist');
        showToast(
          `Đã đọc ${readItems.length} file nhạc! Bấm "Chèn Vào Playlist Phần Đã Chọn" để lưu tất cả.`
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Không thể đọc file âm thanh này'
      );
    } finally {
      setIsReadingAudioFile(false);
    }
  };

  const handleAddMusicTrack = async (e: React.FormEvent) => {
    e.preventDefault();

    if (musicSourceType === 'uploaded_file') {
      const filesToSave =
        pendingUploadedFiles.length > 0
          ? pendingUploadedFiles
          : musicUploadedDataUrl
            ? [
                {
                  fileName: musicUploadedFileName || 'Audio',
                  title:
                    musicTitle.trim() ||
                    musicUploadedFileName.replace(/\.[^/.]+$/, '') ||
                    'Giai Điệu Dịu Êm',
                  dataUrl: musicUploadedDataUrl,
                  formatLabel: musicFormatLabel || 'Audio File',
                },
              ]
            : [];

      if (filesToSave.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 file nhạc từ thiết bị để tải lên.');
        return;
      }

      const addedTracks: MusicTrackItem[] = filesToSave.map((item, idx) => {
        idSeqRef.current += 1;
        const resolvedTitle =
          filesToSave.length === 1 && musicTitle.trim()
            ? musicTitle.trim()
            : item.title || 'Giai Điệu Dịu Êm';
        return {
          id: `track-${Date.now()}-${idSeqRef.current}-${idx}`,
          title: resolvedTitle,
          artistOrNote:
            musicArtist.trim() || `Gửi từ ${settings.senderAlias || 'X'}`,
          sourceType: 'uploaded_file',
          url: item.dataUrl,
          mimeType: item.formatLabel,
          targetSection: musicTargetSection,
          autoPlay: musicIsAutoPlay,
          createdAt: Date.now() + idx,
        };
      });

      const nextTracks = [...addedTracks, ...musicTracks];
      onMusicTracksChange(nextTracks);
      await DataService.appendMusicTracks(addedTracks, nextTracks);

      setMusicTitle('');
      setMusicArtist('');
      setMusicUploadedDataUrl('');
      setMusicUploadedFileName('');
      setPendingUploadedFiles([]);
      showToast(
        addedTracks.length > 1
          ? `Đã thêm ${addedTracks.length} bản nhạc vào Playlist phần đã chọn!`
          : 'Đã chèn bản nhạc mới vào Playlist phần đã chọn!'
      );
      return;
    }

    let finalUrl = '';
    let detectedFormat = musicFormatLabel || 'Audio';
    let parsedYtId: string | undefined;

    if (musicSourceType === 'youtube') {
      const ytId = extractYouTubeId(musicUrlInput);
      if (!ytId) {
        showToast(
          'Đường dẫn YouTube chưa hợp lệ (hỗ trợ youtube.com/watch?v=... hoặc youtu.be/...)'
        );
        return;
      }
      finalUrl = musicUrlInput.trim();
      parsedYtId = ytId;
      detectedFormat = 'YouTube';
    } else {
      if (!musicUrlInput.trim()) {
        showToast(
          'Vui lòng dán đường dẫn URL file nhạc (MP3, WAV, OGG, M4A...)'
        );
        return;
      }
      finalUrl = musicUrlInput.trim();
      const extMatch = finalUrl.split('?')[0].split('.').pop()?.toUpperCase();
      detectedFormat =
        extMatch &&
        ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'FLAC', 'WEBM'].includes(extMatch)
          ? extMatch
          : 'Audio URL';
    }

    idSeqRef.current += 1;
    const newTrack: MusicTrackItem = {
      id: `track-${Date.now()}-${idSeqRef.current}`,
      title: musicTitle.trim() || 'Giai Điệu Dịu Êm Dành Tặng Quỳnh Anh',
      artistOrNote:
        musicArtist.trim() || `Gửi từ ${settings.senderAlias || 'X'}`,
      sourceType: musicSourceType,
      url: finalUrl,
      youtubeId: parsedYtId,
      mimeType: detectedFormat,
      targetSection: musicTargetSection,
      autoPlay: musicIsAutoPlay,
      createdAt: Date.now(),
    };

    const nextTracks = [newTrack, ...musicTracks];
    onMusicTracksChange(nextTracks);
    await DataService.appendMusicTracks([newTrack], nextTracks);

    setMusicTitle('');
    setMusicArtist('');
    setMusicUrlInput('');
    showToast('Đã chèn bản nhạc mới vào Playlist của Quỳnh Anh!');
  };

  const handleUpdateTrackSection = async (
    trackId: string,
    targetSection: MusicTargetSection
  ) => {
    const nextTracks = musicTracks.map((t) =>
      t.id === trackId ? { ...t, targetSection } : t
    );
    onMusicTracksChange(nextTracks);
    await DataService.saveMusicTracks(nextTracks);
    showToast('Đã cập nhật phần phát cho bản nhạc!');
  };

  const handleToggleTrackAutoPlay = async (trackId: string) => {
    const nextTracks = musicTracks.map((t) =>
      t.id === trackId ? { ...t, autoPlay: !t.autoPlay } : t
    );
    onMusicTracksChange(nextTracks);
    await DataService.saveMusicTracks(nextTracks);
    showToast('Đã cập nhật chế độ tự động phát theo trang!');
  };

  const handleMoveTrack = async (trackId: string, direction: -1 | 1) => {
    const idx = musicTracks.findIndex((t) => t.id === trackId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= musicTracks.length) return;
    const reordered = [...musicTracks];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    onMusicTracksChange(reordered);
    await DataService.saveMusicTracks(reordered);
    showToast('Đã cập nhật thứ tự phát trong Playlist!');
  };

  const handleDeleteMusicTrack = async (trackId: string) => {
    const nextTracks = musicTracks.filter((t) => t.id !== trackId);
    onMusicTracksChange(nextTracks);
    await DataService.saveMusicTracks(nextTracks);
    showToast('Đã xóa bản nhạc khỏi Playlist.');
  };

  // External Mini-Game Handlers
  const handleAddExternalGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSrc = extractIframeSrc(gameEmbedInput);
    if (!cleanSrc || !cleanSrc.startsWith('http')) {
      showToast(
        'Vui lòng nhập đường dẫn URL hợp lệ (https://...) hoặc mã nhúng <iframe>.'
      );
      return;
    }

    idSeqRef.current += 1;
    const now = Date.now();
    const newGame: ExternalGameItem = {
      id: `extgame-${now}-${idSeqRef.current}`,
      title: gameTitle.trim() || 'Trò Chơi Nhỏ Thư Giãn',
      subtitle:
        gameSubtitle.trim() ||
        `Góc giải khuây nhẹ nhàng ${settings.senderAlias || 'X'} thêm tặng ${settings.herNickname}`,
      embedUrl: cleanSrc,
      moodNote: gameCategory.trim() || 'Giải stress nhẹ nhàng',
      isActive: true,
      createdAt: now,
    };

    const nextGames = [newGame, ...externalGames];
    onExternalGamesChange(nextGames);
    await DataService.saveExternalGames(nextGames);

    setGameTitle('');
    setGameSubtitle('');
    setGameEmbedInput('');
    showToast('Đã nhúng trò chơi mới vào Góc Nhỏ Giải Khuây!');
  };

  const handleDeleteExternalGame = async (gameId: string) => {
    const nextGames = externalGames.filter((g) => g.id !== gameId);
    onExternalGamesChange(nextGames);
    await DataService.saveExternalGames(nextGames);
    showToast('Đã xóa trò chơi nhúng khỏi danh sách.');
  };

  // Settings Save
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      senderAlias: aliasInput.trim() || 'X',
      herNickname: herNameInput.trim() || 'Quỳnh Anh',
      welcomeNote: welcomeInput.trim() || settings.welcomeNote,
      secretHeaderNote: footerInput.trim() || settings.secretHeaderNote,
    };
    DataService.saveSettings(updated);
    onSettingsChange(updated);
    showToast('Đã cập nhật toàn bộ cài đặt hệ thống!');
  };

  // Wishes / Wish Jar & Surprise Plan handlers
  const handleSaveWishReply = (wish: WishEntry) => {
    const replyText =
      wishReplyDrafts[wish.id] !== undefined
        ? wishReplyDrafts[wish.id].trim()
        : wish.thanhReply || '';
    const planText =
      wishPlanDrafts[wish.id] !== undefined
        ? wishPlanDrafts[wish.id].trim()
        : wish.thanhPrivatePlan || '';
    const updatedList = DataService.updateWishStatus(
      wish.id,
      true,
      replyText,
      planText
    );
    if (onWishesChange) {
      onWishesChange(updatedList);
    }
    showToast(`Đã gửi lời nhắn phản hồi tới ${settings.herNickname}!`);
  };

  const handleSaveWishPlan = (wish: WishEntry) => {
    const replyText =
      wishReplyDrafts[wish.id] !== undefined
        ? wishReplyDrafts[wish.id].trim()
        : wish.thanhReply || '';
    const planText =
      wishPlanDrafts[wish.id] !== undefined
        ? wishPlanDrafts[wish.id].trim()
        : wish.thanhPrivatePlan || '';
    const updatedList = DataService.updateWishStatus(
      wish.id,
      wish.fulfilledByThanh,
      replyText,
      planText
    );
    if (onWishesChange) {
      onWishesChange(updatedList);
    }
    showToast('Đã lưu kế hoạch bất ngờ riêng của Anh Thành!');
  };

  const handleToggleWishFulfilled = (wish: WishEntry) => {
    const nextState = !wish.fulfilledByThanh;
    const planText =
      wishPlanDrafts[wish.id] !== undefined
        ? wishPlanDrafts[wish.id].trim()
        : wish.thanhPrivatePlan || '';
    const updatedList = DataService.updateWishStatus(
      wish.id,
      nextState,
      wish.thanhReply,
      planText
    );
    if (onWishesChange) {
      onWishesChange(updatedList);
    }
    showToast(
      nextState
        ? 'Đã đánh dấu hoàn thành điều ước!'
        : 'Đã chuyển về trạng thái đang ấp ủ.'
    );
  };

  const handleDeleteWishItem = (wishId: string) => {
    const updatedList = DataService.deleteWish(wishId);
    if (onWishesChange) {
      onWishesChange(updatedList);
    }
    showToast('Đã xóa điều ước khỏi danh sách.');
  };

  const filteredWishes = wishes.filter((w) => {
    if (wishFilter === 'pending') return !w.fulfilledByThanh;
    if (wishFilter === 'done') return w.fulfilledByThanh;
    return true;
  });

  const unfulfilledWishCount = wishes.filter((w) => !w.fulfilledByThanh).length;
  const unRepliedDiaryCount = moodDiaryEntries.filter(
    (d) => !d.customAdminReply || !d.customAdminReply.trim()
  ).length;

  // Mood Diary & Preset Message Handlers
  const handleSaveDiaryReply = (entry: MoodDiaryEntry) => {
    const replyText =
      diaryReplyDrafts[entry.id] !== undefined
        ? diaryReplyDrafts[entry.id].trim()
        : entry.customAdminReply || '';
    const updated = DataService.updateMoodDiaryAdminReply(entry.id, replyText);
    if (onMoodDiaryEntriesChange) {
      onMoodDiaryEntriesChange(updated);
    }
    showToast(
      `Đã lưu lời nhắn riêng cho nhật ký ngày ${entry.createdAt} của ${settings.herNickname}!`
    );
  };

  const handleDeleteDiaryEntry = (entryId: string) => {
    const updated = DataService.deleteMoodDiaryEntry(entryId);
    if (onMoodDiaryEntriesChange) {
      onMoodDiaryEntriesChange(updated);
    }
    showToast('Đã xóa bản ghi nhật ký cảm xúc.');
  };

  const currentPresetList =
    moodPresetConfig[selectedPresetEmotion] ||
    DEFAULT_MOOD_PRESET_CONFIG[selectedPresetEmotion] ||
    [];

  const handleUpdatePresetMsg = (index: number, newText: string) => {
    const nextList = [...currentPresetList];
    nextList[index] = newText;
    const nextConfig: MoodPresetConfig = {
      ...moodPresetConfig,
      [selectedPresetEmotion]: nextList,
    };
    DataService.saveMoodPresetConfig(nextConfig);
    if (onMoodPresetConfigChange) {
      onMoodPresetConfigChange(nextConfig);
    }
  };

  const handleAddPresetMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetMsg.trim()) return;
    const nextList = [newPresetMsg.trim(), ...currentPresetList];
    const nextConfig: MoodPresetConfig = {
      ...moodPresetConfig,
      [selectedPresetEmotion]: nextList,
    };
    DataService.saveMoodPresetConfig(nextConfig);
    if (onMoodPresetConfigChange) {
      onMoodPresetConfigChange(nextConfig);
    }
    setNewPresetMsg('');
    showToast('Đã thêm thông điệp cài sẵn mới cho cảm xúc này!');
  };

  const handleDeletePresetMsg = (indexToDelete: number) => {
    const nextList = currentPresetList.filter((_, idx) => idx !== indexToDelete);
    const nextConfig: MoodPresetConfig = {
      ...moodPresetConfig,
      [selectedPresetEmotion]: nextList,
    };
    DataService.saveMoodPresetConfig(nextConfig);
    if (onMoodPresetConfigChange) {
      onMoodPresetConfigChange(nextConfig);
    }
    showToast('Đã xóa câu thông điệp cài sẵn.');
  };

  return (
    <div className="min-h-[100dvh] overflow-x-clip pb-[env(safe-area-inset-bottom)] bg-[#FAF7F2] dark:bg-[#1B1417] text-[#3D3234] dark:text-[#F6EAEF] transition-colors duration-500">
      {/* Top Studio Bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#271D21]/85 backdrop-blur-xl border-b border-[#EEDDD8] dark:border-[#4F3941] px-3 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] flex items-center justify-center text-[#E06D85] dark:text-[#FF9EB0] shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold tracking-tight text-[#3D3234] dark:text-[#F6EAEF] truncate">
                  Góc Nhỏ Studio
                </span>
                <span className="hidden min-[380px]:inline-block text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] font-semibold border border-[#FFCCD5] dark:border-[#6A4A56]">
                  Chế Độ Quản Trị
                </span>
              </div>
              <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] truncate">
                Biệt danh:{' '}
                <strong className="text-[#3D3234] dark:text-[#F6EAEF]">
                  {settings.senderAlias || 'X'}
                </strong>{' '}
                · Dành cho:{' '}
                <strong className="text-[#3D3234] dark:text-[#F6EAEF]">
                  {settings.herNickname || 'Quỳnh Anh'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleCandlelight && (
              <button
                type="button"
                onClick={onToggleCandlelight}
                title={
                  isCandlelightMode
                    ? 'Chuyển sang Nắng Sớm Ban Ngày'
                    : 'Bật Ánh Đèn Đêm dịu mắt'
                }
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isCandlelightMode
                    ? 'bg-[#3D2C33] text-[#FFD6A5] border-[#6A4A56]'
                    : 'bg-white hover:bg-[#FFF0F3] text-[#7E6E70] border-[#EEDDD8]'
                }`}
              >
                {isCandlelightMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#FFD6A5]" />
                    <span className="hidden sm:inline">Nắng Sớm</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#D95B72]" />
                    <span className="hidden sm:inline">Ánh Đèn Đêm</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePreview}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-white/90 dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2830] border border-[#EEDDD8] dark:border-[#533D45] text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] shadow-2xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#E06D85] dark:text-[#FF9EB0]" />
              <span className="hidden md:inline">Xem Thử Giao Diện Quỳnh Anh</span>
              <span className="md:hidden">Xem thử</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-xs font-medium text-[#C94A63] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng Xuất</span>
              <span className="sm:hidden">Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-7xl mx-auto px-3 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col items-stretch justify-between border-b border-[#EEDDD8] dark:border-[#4A363D] pb-3 sm:pb-4 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'photos'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Ảnh Polaroid ({photos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diary')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'diary'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <BookHeart className="w-4 h-4" />
              <span>
                Nhật Ký Cảm Xúc ({moodDiaryEntries.length})
              </span>
              {unRepliedDiaryCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold">
                  {unRepliedDiaryCount} chờ nhắn
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('music')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'music'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Âm Nhạc Theo Phần ({musicTracks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('games')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'games'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Kho Mini-Game ({3 + externalGames.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jars')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'jars'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>Hũ Kẹo Cảm Xúc (4 Hũ)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wishes')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'wishes'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <StickyNote className="w-4 h-4" />
              <span>
                Hũ Điều Ước ({wishes.length})
              </span>
              {unfulfilledWishCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold">
                  {unfulfilledWishCount} mới
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-[#E06D85] text-white shadow-xs'
                  : 'bg-white/90 dark:bg-[#2A1F24]/90 text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Cài Đặt &amp; Biệt Danh</span>
            </button>
          </div>

          {/* Quick Notification Toast */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="self-start text-xs font-medium text-[#1B6F45] dark:text-[#7AD3A4] bg-[#E8F8EE] dark:bg-[#1E352A] border border-[#BDE8CB] dark:border-[#396750] px-3.5 py-2 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{toastMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TAB 1: Quản lý Kho Ảnh Polaroid */}
        {activeTab === 'photos' && (
          <div className="space-y-8">
            {/* Quick Upload Panel */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                    <span>Tải Ảnh Mới Lên Tường Polaroid Của Quỳnh Anh</span>
                  </h2>
                  <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                    Hỗ trợ chọn hoặc kéo thả nhiều ảnh cùng lúc · Tự động nén tối ưu hiển thị mượt mà
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddPhotos} className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#FFCCD5] dark:border-[#6A4A56] bg-[#FFF8F9] dark:bg-[#312429]/80 hover:bg-[#FFF0F3] dark:hover:bg-[#3D2830] rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-[#E06D85] dark:text-[#FF9EB0] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                    {uploadFiles.length > 0
                      ? `Đã chọn ${uploadFiles.length} bức ảnh (Bấm để chọn thêm)`
                      : 'Bấm vào đây để chọn ảnh từ máy tính / điện thoại'}
                  </p>
                  <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-1">
                    Định dạng JPG, PNG · Có thể chọn nhiều file
                  </p>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="p-3.5 sm:p-4 bg-[#FAF7F2] dark:bg-[#22191D] rounded-xl border border-[#EEDDD8] dark:border-[#533D45] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                          Lời nhắn viết tay dưới đáy ảnh (áp dụng cho loạt ảnh mới)
                        </label>
                        <input
                          type="text"
                          value={newCaption}
                          onChange={(e) => setNewCaption(e.target.value)}
                          placeholder="Ví dụ: Giữa một chiều ngập nắng, năng lượng trong trẻo này làm ai cũng thấy dễ chịu..."
                          className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                          Tag cảm xúc
                        </label>
                        <select
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                        >
                          {EMOTION_TAGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                        Câu chuyện đằng sau bức ảnh (hiển thị khi Quỳnh Anh bấm mở Lightbox)
                      </label>
                      <textarea
                        rows={2}
                        value={newStory}
                        onChange={(e) => setNewStory(e.target.value)}
                        placeholder="Viết đôi dòng kỷ niệm gửi gắm..."
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9C6B19] dark:text-[#F3CE8A] mb-1">
                        <Lock className="w-3 h-3 text-[#C68E28] dark:text-[#F3CE8A]" />
                        <span>Ghi chú bí mật của Anh Thành (Chỉ bạn nhìn thấy — ẩn hoàn toàn với {settings.herNickname})</span>
                      </label>
                      <textarea
                        rows={2}
                        value={newSecretCaption}
                        onChange={(e) => setNewSecretCaption(e.target.value)}
                        placeholder="Ghi lại cảm xúc thật hoặc dự định riêng của bạn cho bức ảnh này..."
                        className="w-full px-3 py-2 rounded-lg bg-[#FFFDF7] dark:bg-[#36281D]/90 border border-[#F0D39A] dark:border-[#6E5432] text-base sm:text-xs text-[#3D3234] dark:text-[#EAD2A2] focus:outline-none focus:border-[#C68E28]"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                          Ngày lưu niệm:
                        </label>
                        <input
                          type="text"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-28 px-2.5 py-1.5 min-h-[40px] sm:min-h-0 rounded-md bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] tabular-nums"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setUploadFiles([])}
                          className="px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] cursor-pointer"
                        >
                          Hủy chọn
                        </button>
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-lg bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Lưu {uploadFiles.length} Ảnh Lên Trang</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Photos List Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                  Danh Sách Toàn Bộ Ảnh Polaroid ({photos.length} bức ảnh)
                </h3>
                <span className="text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                  Sửa trực tiếp từng trường bên dưới và bấm &ldquo;Lưu&rdquo;
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {photos.map((photo, index) => {
                  const draft = photoDrafts[photo.id] || {};
                  const currentCaption =
                    draft.caption !== undefined ? draft.caption : photo.caption;
                  const currentStory =
                    draft.story !== undefined ? draft.story : photo.story;
                  const currentSecretCaption =
                    draft.secretCaption !== undefined
                      ? draft.secretCaption
                      : photo.secretCaption || '';
                  const currentTag =
                    draft.emotionTag !== undefined
                      ? draft.emotionTag
                      : photo.emotionTag;
                  const currentDate =
                    draft.date !== undefined ? draft.date : photo.date;
                  const isDirty = Boolean(photoDrafts[photo.id]);

                  return (
                    <div
                      key={photo.id}
                      className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start"
                    >
                      {/* Left thumbnail & flags */}
                      <div className="lg:col-span-3 flex flex-col items-center">
                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF7F2] dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45]">
                          <img
                            src={photo.imageUrl}
                            alt={currentCaption}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold border border-[#FFCCD5] dark:border-[#6A4A56] shadow-xs">
                              <Star className="w-3 h-3 fill-[#D95B72] dark:fill-[#FF9EB0]" />
                              <span>Tiêu điểm</span>
                            </span>
                          )}
                        </div>

                        <div className="w-full mt-2.5 flex items-center justify-between text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">
                          <span className="tabular-nums">Ảnh #{index + 1}</span>
                          <span className="inline-flex items-center gap-1 text-[#D95B72] dark:text-[#FF9EB0]">
                            <Heart className="w-3 h-3 fill-[#D95B72] dark:fill-[#FF9EB0]" />
                            <strong className="tabular-nums">{photo.likes}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Form Fields */}
                      <div className="lg:col-span-9 min-w-0 space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                            Dòng chữ viết tay dưới ảnh
                          </label>
                          <input
                            type="text"
                            value={currentCaption}
                            onChange={(e) =>
                              handleDraftChange(photo.id, 'caption', e.target.value)
                            }
                            className="w-full px-3 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                            Câu chuyện đằng sau bức ảnh (Lightbox của Quỳnh Anh)
                          </label>
                          <textarea
                            rows={2}
                            value={currentStory}
                            onChange={(e) =>
                              handleDraftChange(photo.id, 'story', e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9C6B19] dark:text-[#F3CE8A] mb-1">
                            <Lock className="w-3 h-3 text-[#C68E28] dark:text-[#F3CE8A]" />
                            <span>Ghi chú bí mật của Anh Thành (ẩn hoàn toàn với {settings.herNickname})</span>
                          </label>
                          <textarea
                            rows={2}
                            value={currentSecretCaption}
                            onChange={(e) =>
                              handleDraftChange(
                                photo.id,
                                'secretCaption',
                                e.target.value
                              )
                            }
                            placeholder="Thêm ghi chú riêng chỉ bạn nhìn thấy..."
                            className="w-full px-3 py-2 rounded-lg bg-[#FFFDF7] dark:bg-[#36281D]/90 border border-[#F0D39A] dark:border-[#6E5432] text-base sm:text-xs text-[#3D3234] dark:text-[#EAD2A2] focus:outline-none focus:border-[#C68E28]"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">Ngày:</span>
                              <input
                                type="text"
                                value={currentDate}
                                onChange={(e) =>
                                  handleDraftChange(photo.id, 'date', e.target.value)
                                }
                                className="w-24 px-2 py-1.5 min-h-[40px] sm:min-h-0 rounded bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] tabular-nums"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">Tag:</span>
                              <select
                                value={currentTag}
                                onChange={(e) =>
                                  handleDraftChange(
                                    photo.id,
                                    'emotionTag',
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1.5 min-h-[40px] sm:min-h-0 rounded bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF]"
                              >
                                {EMOTION_TAGS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {index !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetFeatured(photo)}
                                className="inline-flex items-center gap-1 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg bg-[#FFF8F9] dark:bg-[#3A2930] hover:bg-[#FFF0F3] dark:hover:bg-[#49323B] text-[11px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56] transition-colors cursor-pointer"
                              >
                                <Star className="w-3 h-3" />
                                <span>Đặt làm tiêu điểm</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSavePhotoDraft(photo)}
                              disabled={!isDirty}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                isDirty
                                  ? 'bg-[#E06D85] text-white shadow-xs hover:bg-[#D55C75]'
                                  : 'bg-[#FAF7F2] dark:bg-[#22191D] text-[#B09F9B] dark:text-[#8E767E] border border-[#EEDDD8] dark:border-[#4A363D]'
                              }`}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isDirty ? 'Lưu Thay Đổi' : 'Đã Lưu'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg bg-white dark:bg-[#22191D] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#C94A63] dark:text-[#FF9EB0] border border-[#EEDDD8] dark:border-[#533D45] transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Quản lý Âm Nhạc Theo Phần (YouTube, URL, Upload MP3/WAV/OGG/M4A...) */}
        {activeTab === 'music' && (
          <div className="space-y-8">
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="mb-5">
                <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0]" />
                  <span>
                    Chèn Nhạc Chủ Động Vào Từng Phần Của Sổ Lưu Niệm
                  </span>
                </h2>
                <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                  Hỗ trợ đường dẫn YouTube (youtube.com, youtu.be), link file âm thanh trực tiếp hoặc tải file từ máy (MP3, WAV, OGG, M4A, AAC, WEBM). Khi Quỳnh Anh lật sang phần tương ứng, trình phát mini sẽ tự động chuyển sang bản nhạc bạn gắn cho phần đó.
                </p>
              </div>

              <form onSubmit={handleAddMusicTrack} className="space-y-4">
                {/* Source type selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('youtube');
                      setMusicFormatLabel('YouTube');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      musicSourceType === 'youtube'
                        ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#E06D85] dark:border-[#E06D82] text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs'
                        : 'bg-[#FAF7F2] dark:bg-[#22191D] border-[#EEDDD8] dark:border-[#533D45] text-[#3D3234] dark:text-[#F6EAEF]'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>1. Đường dẫn YouTube</span>
                    </div>
                    <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                      Dán link youtube.com/watch?v=... hoặc youtu.be/...
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('uploaded_file');
                      setMusicFormatLabel('MP3 / WAV / M4A');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      musicSourceType === 'uploaded_file'
                        ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#E06D85] dark:border-[#E06D82] text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs'
                        : 'bg-[#FAF7F2] dark:bg-[#22191D] border-[#EEDDD8] dark:border-[#533D45] text-[#3D3234] dark:text-[#F6EAEF]'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <FileAudio className="w-3.5 h-3.5" />
                      <span>2. Tải File Nhạc Lên</span>
                    </div>
                    <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                      Hỗ trợ MP3, WAV, OGG, M4A, AAC, WEBM từ thiết bị
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('audio_url');
                      setMusicFormatLabel('Audio URL');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      musicSourceType === 'audio_url'
                        ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#E06D85] dark:border-[#E06D82] text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs'
                        : 'bg-[#FAF7F2] dark:bg-[#22191D] border-[#EEDDD8] dark:border-[#533D45] text-[#3D3234] dark:text-[#F6EAEF]'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      <span>3. Link File Nhạc Trực Tiếp</span>
                    </div>
                    <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                      Dán URL trực tiếp (.mp3, .wav, .ogg, .m4a, stream...)
                    </p>
                  </button>
                </div>

                {/* Source input field */}
                {musicSourceType === 'uploaded_file' ? (
                  <div className="space-y-3">
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
                      onChange={(e) => {
                        handleAudioFileSelected(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <div
                      onClick={() => audioFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#FFCCD5] dark:border-[#6A4A56] bg-[#FFF8F9] dark:bg-[#312429]/80 hover:bg-[#FFF0F3] dark:hover:bg-[#3D2830] rounded-xl p-5 text-center cursor-pointer transition-colors"
                    >
                      <FileAudio className="w-6 h-6 text-[#E06D85] dark:text-[#FF9EB0] mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                        {isReadingAudioFile
                          ? 'Đang xử lý các file âm thanh...'
                          : pendingUploadedFiles.length > 0
                            ? `Đã chọn ${pendingUploadedFiles.length} bản nhạc — Bấm để chọn thêm file vào Playlist`
                            : 'Bấm để chọn một hoặc nhiều file nhạc cùng lúc'}
                      </p>
                      <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                        Hỗ trợ chọn nhiều bài MP3, WAV, OGG, M4A, AAC, WEBM để tạo Playlist cho từng phần
                      </p>
                    </div>

                    {pendingUploadedFiles.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                          <span>
                            Hàng đợi tạo Playlist ({pendingUploadedFiles.length} bài)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingUploadedFiles([]);
                              setMusicUploadedDataUrl('');
                              setMusicUploadedFileName('');
                            }}
                            className="text-[#C94A63] dark:text-[#FF9EB0] hover:underline cursor-pointer"
                          >
                            Xóa hàng đợi
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pendingUploadedFiles.map((item, idx) => (
                            <span
                              key={`${item.fileName}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#2E2227] border border-[#EEDDD8] dark:border-[#533D45] text-[11px] text-[#3D3234] dark:text-[#F6EAEF]"
                            >
                              <Music className="w-3 h-3 text-[#E06D85] dark:text-[#FF9EB0]" />
                              <span className="max-w-[180px] truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-[#7E6E70] dark:text-[#C7B0B7]">
                                ({item.formatLabel})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      {musicSourceType === 'youtube'
                        ? 'Đường dẫn video / bài hát YouTube'
                        : 'Đường dẫn URL file âm thanh (.mp3, .wav, .ogg, .m4a...)'}
                    </label>
                    <input
                      type="text"
                      value={musicUrlInput}
                      onChange={(e) => setMusicUrlInput(e.target.value)}
                      placeholder={
                        musicSourceType === 'youtube'
                          ? 'https://www.youtube.com/watch?v=... hoặc https://youtu.be/...'
                          : 'https://.../bai-hat-chua-lanh.mp3'
                      }
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    />
                  </div>
                )}

                {/* Track Title, Artist & Target Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      {pendingUploadedFiles.length > 1
                        ? 'Tên từng bài (tự lấy theo tên file)'
                        : 'Tên bản nhạc hiển thị'}
                    </label>
                    <input
                      type="text"
                      value={musicTitle}
                      disabled={pendingUploadedFiles.length > 1}
                      onChange={(e) => setMusicTitle(e.target.value)}
                      placeholder={
                        pendingUploadedFiles.length > 1
                          ? 'Đang lấy tên gốc của từng bài...'
                          : 'Ví dụ: Giai Điệu Chiều Thu Dịu Êm'
                      }
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85] disabled:opacity-65"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      Nghệ sĩ / Lời đề tặng ngắn
                    </label>
                    <input
                      type="text"
                      value={musicArtist}
                      onChange={(e) => setMusicArtist(e.target.value)}
                      placeholder={`Ví dụ: ${settings.senderAlias || 'X'} dành tặng ${settings.herNickname}`}
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      Chèn vào phần nào của sổ lưu niệm?
                    </label>
                    <select
                      value={musicTargetSection}
                      onChange={(e) =>
                        setMusicTargetSection(
                          e.target.value as MusicTargetSection
                        )
                      }
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    >
                      {MUSIC_SECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-[#3D3234] dark:text-[#F6EAEF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={musicIsAutoPlay}
                      onChange={(e) => setMusicIsAutoPlay(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#E06D85] shrink-0"
                    />
                    <span>
                      Ưu tiên tự động phát Playlist này khi Quỳnh Anh mở phần tương ứng
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isReadingAudioFile}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {pendingUploadedFiles.length > 1
                        ? `Chèn ${pendingUploadedFiles.length} Bài Vào Playlist`
                        : 'Chèn Bản Nhạc Vào Playlist'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Music Tracks List & Section Playlist Filter */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                  <span>
                    Playlist Nhạc Theo Từng Phần ({musicTracks.length} bản nhạc)
                  </span>
                </h3>
                <span className="text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                  Mỗi phần hỗ trợ nhiều bài hát tự động chuyển tiếp thành Playlist
                </span>
              </div>

              {/* Filter by targetSection */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setMusicSectionFilter('all_filter')}
                  className={`px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    musicSectionFilter === 'all_filter'
                      ? 'bg-[#E06D85] text-white border-[#E06D85]'
                      : 'bg-[#FAF7F2] dark:bg-[#22191D] text-[#7E6E70] dark:text-[#C7B0B7] border-[#EEDDD8] dark:border-[#533D45] hover:text-[#3D3234] dark:hover:text-[#F6EAEF]'
                  }`}
                >
                  Tất cả ({musicTracks.length})
                </button>
                {MUSIC_SECTION_OPTIONS.map((opt) => {
                  const count = musicTracks.filter(
                    (t) => t.targetSection === opt.value
                  ).length;
                  const active = musicSectionFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMusicSectionFilter(opt.value)}
                      className={`px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#E06D85] text-white border-[#E06D85]'
                          : 'bg-[#FAF7F2] dark:bg-[#22191D] text-[#7E6E70] dark:text-[#C7B0B7] border-[#EEDDD8] dark:border-[#533D45] hover:text-[#3D3234] dark:hover:text-[#F6EAEF]'
                      }`}
                    >
                      {opt.label.split('·')[0].split('(')[0].trim()} ({count})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const visibleTracks =
                  musicSectionFilter === 'all_filter'
                    ? musicTracks
                    : musicTracks.filter(
                        (t) => t.targetSection === musicSectionFilter
                      );
                if (visibleTracks.length === 0) {
                  return (
                    <div className="p-8 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-dashed border-[#EEDDD8] dark:border-[#533D45] text-center text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                      Chưa có bản nhạc nào trong mục này. Hãy chọn nhiều file nhạc hoặc dán link ở khung bên trên để tạo Playlist!
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 gap-3">
                    {visibleTracks.map((track, visibleIdx) => (
                      <div
                        key={track.id}
                        className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-md bg-white dark:bg-[#2E2227] border border-[#EEDDD8] dark:border-[#533D45] text-[10px] font-bold text-[#7E6E70] dark:text-[#C7B0B7] flex items-center justify-center tabular-nums">
                              {visibleIdx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold">
                              {track.mimeType ||
                                (track.sourceType === 'youtube'
                                  ? 'YouTube'
                                  : 'Audio')}
                            </span>
                            <h4 className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF] truncate">
                              {track.title}
                            </h4>
                            <span className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">
                              · {track.artistOrNote}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] truncate max-w-xl">
                            {track.sourceType === 'uploaded_file'
                              ? 'File âm thanh lưu an toàn trong kho riêng (Playlist)'
                              : track.url}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0 min-w-0">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTrack(track.id, -1)}
                              className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg bg-white dark:bg-[#2E2227] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45] cursor-pointer inline-flex items-center justify-center"
                              title="Đưa lên trước trong Playlist"
                            >
                              <ArrowUp className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTrack(track.id, 1)}
                              className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg bg-white dark:bg-[#2E2227] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF] border border-[#EEDDD8] dark:border-[#533D45] cursor-pointer inline-flex items-center justify-center"
                              title="Đưa xuống sau trong Playlist"
                            >
                              <ArrowDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            </button>
                          </div>

                          <select
                            value={track.targetSection}
                            onChange={(e) =>
                              handleUpdateTrackSection(
                                track.id,
                                e.target.value as MusicTargetSection
                              )
                            }
                            className="max-w-full min-w-0 px-2.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs font-medium text-[#3D3234] dark:text-[#F6EAEF]"
                          >
                            {MUSIC_SECTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleTrackAutoPlay(track.id)}
                            className={`px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              track.autoPlay
                                ? 'bg-[#E8F8EE] dark:bg-[#1E352A] text-[#1B6F45] dark:text-[#7AD3A4] border-[#BDE8CB] dark:border-[#396750]'
                                : 'bg-white dark:bg-[#2E2227] text-[#7E6E70] dark:text-[#C7B0B7] border-[#EEDDD8] dark:border-[#533D45]'
                            }`}
                          >
                            {track.autoPlay ? '✓ Tự phát' : 'Thủ công'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMusicTrack(track.id)}
                            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg bg-white dark:bg-[#2E2227] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#C94A63] dark:text-[#FF9EB0] border border-[#EEDDD8] dark:border-[#533D45] cursor-pointer inline-flex items-center justify-center"
                            title="Xóa bản nhạc này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: Kho Mini-Game Giải Khuây & Nhúng Game Ngoài */}
        {activeTab === 'games' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Built-in 3 Healing Games Overview */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0]" />
                    <span>
                      3 Trò Chơi Mini Chữa Lành Tích Hợp Sẵn (Hiển Thị Tinh Tế Ở Trang 03)
                    </span>
                  </h2>
                  <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                    Được thiết kế ít chữ, nhẹ nhàng, âm thanh êm dịu và truyền năng lượng tích cực cho {settings.herNickname} khi bấm nút &ldquo;Góc Nhỏ Giải Khuây&rdquo; ở Trang 03.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45]">
                  <div className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                    1. Bong Bóng &amp; Sao Rơi Tích Cực
                  </div>
                  <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-1">
                    Chạm nhẹ vào những quả bong bóng pastel đang bay lên để giải tỏa mỏi mệt và đón những lời nhắn ấm áp.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45]">
                  <div className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                    2. Chăm Sóc Chậu Hoa Nhỏ
                  </div>
                  <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-1">
                    Tưới sương, sưởi nắng và gửi gió dịu để chậu cây lớn dần từ mầm non tới khi nở hoa rực rỡ kèm lời chúc.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45]">
                  <div className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                    3. Lật Thẻ Biểu Tượng Bình Yên
                  </div>
                  <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-1">
                    Lật mở từng cặp thẻ bài pastel nhẹ nhàng, không giới hạn thời gian gây áp lực.
                  </p>
                </div>
              </div>
            </div>

            {/* External HTML5 Game Embed Form */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="mb-5">
                <h3 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                  <span>
                    Nhúng Thêm Game Từ Kho Game Bên Ngoài Vào Góc Giải Khuây
                  </span>
                </h3>
                <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                  Dán đường dẫn URL game HTML5 hoặc mã nhúng <code>&lt;iframe src=&quot;...&quot;&gt;</code> từ các kho game web bên ngoài. Game sẽ xuất hiện thành một tab gọn gàng ngay trong cửa sổ Pop-up Giải Khuây của Quỳnh Anh.
                </p>
              </div>

              <form onSubmit={handleAddExternalGame} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      Tên trò chơi hiển thị
                    </label>
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      placeholder="Ví dụ: Ghép Hình Thư Giãn / 2048 Pastel"
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      Mô tả ngắn (1 dòng tinh tế)
                    </label>
                    <input
                      type="text"
                      value={gameSubtitle}
                      onChange={(e) => setGameSubtitle(e.target.value)}
                      placeholder="Chơi nhẹ nhàng vài phút cho thư thái nhé"
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                      Nhãn cảm xúc / thể loại
                    </label>
                    <input
                      type="text"
                      value={gameCategory}
                      onChange={(e) => setGameCategory(e.target.value)}
                      placeholder="Giải tỏa căng thẳng"
                      className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                    Đường dẫn URL Game hoặc mã nhúng &lt;iframe&gt;
                  </label>
                  <input
                    type="text"
                    value={gameEmbedInput}
                    onChange={(e) => setGameEmbedInput(e.target.value)}
                    placeholder='https://... hoặc <iframe src="https://..." ...></iframe>'
                    className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nhúng Game Vào Góc Nhỏ Giải Khuây</span>
                  </button>
                </div>
              </form>

              {/* External games list */}
              <div className="mt-6 pt-5 border-t border-[#EEDDD8] dark:border-[#4A363D] space-y-3">
                <h4 className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                  Danh sách game bên ngoài đã nhúng ({externalGames.length})
                </h4>

                {externalGames.length === 0 ? (
                  <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] italic">
                    Hiện đang hiển thị 3 trò chơi chữa lành mặc định. Khi cần thêm game từ các kho bên ngoài, bạn chỉ cần dán link ở trên.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {externalGames.map((game) => (
                      <div
                        key={game.id}
                        className="p-3.5 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold border border-[#FFCCD5] dark:border-[#6A4A56]">
                              {game.moodNote}
                            </span>
                            <h5 className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF] truncate">
                              {game.title}
                            </h5>
                          </div>
                          <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] truncate mt-0.5">
                            {game.embedUrl}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteExternalGame(game.id)}
                          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg bg-white dark:bg-[#2E2227] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#C94A63] dark:text-[#FF9EB0] border border-[#EEDDD8] dark:border-[#533D45] cursor-pointer shrink-0 inline-flex items-center justify-center"
                          title="Xóa game này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Quản lý 4 Hũ Kẹo Cảm Xúc */}
        {activeTab === 'jars' && (
          <div className="space-y-6">
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] mb-2 flex items-center gap-2">
                <Smile className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                <span>
                  Quản Lý 4 Hũ Kẹo Cảm Xúc Dành Tặng {settings.herNickname}
                </span>
              </h2>
              <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mb-6">
                Chọn hũ bên dưới để xem toàn bộ các thông điệp, thêm thông điệp mới hoặc xóa bớt câu cũ.
              </p>

              {/* Jar selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {moodJars.map((jar) => {
                  const isSelected = jar.id === selectedJarId;
                  return (
                    <button
                      key={jar.id}
                      type="button"
                      onClick={() => setSelectedJarId(jar.id)}
                      className={`p-3.5 min-h-[56px] rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#E06D85] dark:border-[#E06D82] shadow-xs'
                          : 'bg-[#FAF7F2] dark:bg-[#22191D] border-[#EEDDD8] dark:border-[#533D45] hover:bg-white dark:hover:bg-[#2E2227]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                        {jar.title}
                      </div>
                      <div className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5 tabular-nums">
                        {jar.messages.length} lời nhắn
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Jar subtitle input */}
              <div className="mb-6 p-3.5 sm:p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45]">
                <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1">
                  Mô tả phụ của {currentJar?.title} (hiển thị trên thẻ chọn của Quỳnh Anh):
                </label>
                <input
                  type="text"
                  value={currentJar?.subtitle || ''}
                  onChange={(e) => handleUpdateJarSubtitle(e.target.value)}
                  className="w-full px-3 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                />
              </div>

              {/* Add message form */}
              <form
                onSubmit={handleAddMessageToJar}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6"
              >
                <input
                  type="text"
                  value={newJarMsg}
                  onChange={(e) => setNewJarMsg(e.target.value)}
                  placeholder={`Viết câu lời nhắn mới vào ${currentJar?.title}...`}
                  className="flex-1 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Vào Hũ</span>
                </button>
              </form>

              {/* Message List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                    Danh sách lời nhắn trong {currentJar?.title} (có thể chỉnh sửa trực tiếp):
                  </h4>
                  <span className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">
                    Tự động lưu vào CSDL chung
                  </span>
                </div>
                {currentJar?.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex items-start justify-between gap-2.5 sm:gap-3"
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-2">
                      <span className="font-semibold text-[#E06D85] dark:text-[#FF9EB0] text-xs mt-1.5 shrink-0">
                        #{idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        value={msg}
                        onChange={(e) =>
                          handleUpdateJarMessage(idx, e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85] leading-relaxed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteJarMessage(idx)}
                      className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg text-[#C94A63] dark:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer shrink-0 mt-0.5 inline-flex items-center justify-center"
                      title="Xóa câu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Hũ Điều Ước & Kế Hoạch Bất Ngờ Từ Anh Thành */}
        {activeTab === 'wishes' && (
          <div className="space-y-6">
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                    <MessageSquareHeart className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                    <span>
                      Hũ Điều Ước Của {settings.herNickname} &amp; Kế Hoạch Bất Ngờ (
                      {wishes.length})
                    </span>
                  </h2>
                  <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                    Mọi điều ước {settings.herNickname} thả vào hũ sẽ xuất hiện tại đây. Bạn có thể gửi hồi đáp công khai hoặc viết kế hoạch bất ngờ bí mật cho riêng mình.
                  </p>
                </div>

                {/* Wish Status Filter */}
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#22191D] p-1 rounded-xl border border-[#EEDDD8] dark:border-[#533D45] overflow-x-auto no-scrollbar max-w-full">
                  {[
                    { key: 'all', label: `Tất cả (${wishes.length})` },
                    {
                      key: 'pending',
                      label: `Chờ thực hiện (${unfulfilledWishCount})`,
                    },
                    {
                      key: 'done',
                      label: `Đã hoàn thành (${wishes.length - unfulfilledWishCount})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setWishFilter(tab.key as 'all' | 'pending' | 'done')
                      }
                      className={`px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        wishFilter === tab.key
                          ? 'bg-[#E06D85] text-white shadow-2xs'
                          : 'text-[#7E6E70] dark:text-[#C7B0B7] hover:text-[#3D3234] dark:hover:text-[#F6EAEF]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredWishes.length === 0 ? (
                <div className="p-10 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-dashed border-[#EEDDD8] dark:border-[#533D45] text-center text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                  Không có điều ước nào trong mục này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredWishes.map((wish) => {
                    const currentReply =
                      wishReplyDrafts[wish.id] !== undefined
                        ? wishReplyDrafts[wish.id]
                        : wish.thanhReply || '';
                    const currentPlan =
                      wishPlanDrafts[wish.id] !== undefined
                        ? wishPlanDrafts[wish.id]
                        : wish.thanhPrivatePlan || '';

                    return (
                      <div
                        key={wish.id}
                        className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-[#7E6E70] dark:text-[#C7B0B7] mb-2">
                            <span className="truncate">
                              <span className="tabular-nums">
                                {wish.createdAt}
                              </span>
                              {wish.category && (
                                <>
                                  {' · '}
                                  <span className="text-[#D95B72] dark:text-[#FF9EB0] font-semibold">
                                    {wish.category}
                                  </span>
                                </>
                              )}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleWishFulfilled(wish)}
                                className={`px-3 py-1 sm:px-2.5 sm:py-0.5 min-h-[34px] sm:min-h-0 rounded-full text-[11px] font-semibold cursor-pointer ${
                                  wish.fulfilledByThanh
                                    ? 'bg-[#E8F8EE] dark:bg-[#1E352A] text-[#1B6F45] dark:text-[#7AD3A4] border border-[#BDE8CB] dark:border-[#396750]'
                                    : 'bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56]'
                                }`}
                              >
                                {wish.fulfilledByThanh
                                  ? '✓ Đã thực hiện'
                                  : 'Đang ấp ủ'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteWishItem(wish.id)}
                                title="Xóa điều ước này"
                                className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 sm:p-1 rounded-lg text-[#C94A63] dark:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] cursor-pointer inline-flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                            {wish.title}
                          </h3>
                          <p className="text-xs text-[#3D3234] dark:text-[#F6EAEF] mt-1.5 bg-white dark:bg-[#1B1417] p-3 rounded-xl border border-[#EEDDD8] dark:border-[#4A363D] italic">
                            &ldquo;{wish.note}&rdquo;
                          </p>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[#EEDDD8] dark:border-[#4A363D]">
                          {/* Public Reply sent to Quỳnh Anh */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                              Lời nhắn công khai gửi lại {settings.herNickname}:
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                value={currentReply}
                                onChange={(e) =>
                                  setWishReplyDrafts((prev) => ({
                                    ...prev,
                                    [wish.id]: e.target.value,
                                  }))
                                }
                                placeholder="Viết đôi dòng nhắn lại cho Quỳnh Anh..."
                                className="flex-1 px-3 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveWishReply(wish)}
                                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold cursor-pointer shrink-0"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Gửi Em</span>
                              </button>
                            </div>
                          </div>

                          {/* Private Surprise Planner strictly for Anh Thành */}
                          <div className="p-3 rounded-xl bg-[#FFF8EA] dark:bg-[#36281D]/90 border border-dashed border-[#F0D39A] dark:border-[#6E5432] space-y-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9C6B19] dark:text-[#F3CE8A]">
                              <Lock className="w-3 h-3 text-[#C68E28] dark:text-[#F3CE8A]" />
                              <span>
                                Kế hoạch bất ngờ riêng của Anh Thành (ẩn hoàn toàn với em):
                              </span>
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                              <textarea
                                rows={2}
                                value={currentPlan}
                                onChange={(e) =>
                                  setWishPlanDrafts((prev) => ({
                                    ...prev,
                                    [wish.id]: e.target.value,
                                  }))
                                }
                                placeholder="Ghi chú ngày dự kiến, quán định đặt, món quà bất ngờ..."
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#231914] border border-[#F0D39A] dark:border-[#6E5432] text-base sm:text-xs text-[#3D3234] dark:text-[#EAD2A2] focus:outline-none focus:border-[#C68E28]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveWishPlan(wish)}
                                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-[#C68E28] hover:bg-[#B07D20] text-white text-xs font-semibold cursor-pointer shrink-0"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Lưu Plan</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Nhật Ký Cảm Xúc Hàng Ngày & Lời Nhắn Từ X */}
        {activeTab === 'diary' && (
          <div className="space-y-8">
            {/* Section 1: Daily Mood Entries from Quỳnh Anh & Personal Reply */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                    <BookHeart className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                    <span>
                      Nhật Ký Cảm Xúc Hàng Ngày Của {settings.herNickname} (
                      {moodDiaryEntries.length} bản ghi)
                    </span>
                  </h2>
                  <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                    Mỗi khi {settings.herNickname} chọn biểu tượng cảm xúc và viết đôi dòng trong Trạm Lắng Nghe, bản ghi sẽ xuất hiện tại đây. Bạn có thể để lại lời nhắn riêng cho từng ngày để cổ vũ hoặc vỗ về cô ấy.
                  </p>
                </div>
              </div>

              {moodDiaryEntries.length === 0 ? (
                <div className="p-10 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-dashed border-[#EEDDD8] dark:border-[#533D45] text-center text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                  Chưa có bản ghi nhật ký cảm xúc nào từ {settings.herNickname}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moodDiaryEntries.map((entry) => {
                    const currentDraft =
                      diaryReplyDrafts[entry.id] !== undefined
                        ? diaryReplyDrafts[entry.id]
                        : entry.customAdminReply || '';

                    return (
                      <div
                        key={entry.id}
                        className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-[#7E6E70] dark:text-[#C7B0B7]">
                            <span className="font-bold text-[#D95B72] dark:text-[#FF9EB0]">
                              {entry.emotionLabel}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-[11px]">
                                {entry.createdAt}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiaryEntry(entry.id)}
                                title="Xóa bản ghi nhật ký này"
                                className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 sm:p-1 rounded-lg text-[#C94A63] dark:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] cursor-pointer inline-flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#4A363D] text-xs text-[#3D3234] dark:text-[#F6EAEF] italic">
                            &ldquo;{entry.shortNote}&rdquo;
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#FFF8F9] dark:bg-[#2E2126] border border-[#F7D6E0] dark:border-[#533D45] text-[11px] text-[#7E6E70] dark:text-[#C7B0B7]">
                            <span className="font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                              Thông điệp cài sẵn đã tự động gửi:{' '}
                            </span>
                            <span>{entry.presetMessage}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[#EEDDD8] dark:border-[#4A363D]">
                          <label className="block text-[11px] font-semibold text-[#3D3234] dark:text-[#F6EAEF]">
                            Lời nhắn riêng của {settings.senderAlias || 'X'} dành cho ngày hôm nay:
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={currentDraft}
                              onChange={(e) =>
                                setDiaryReplyDrafts((prev) => ({
                                  ...prev,
                                  [entry.id]: e.target.value,
                                }))
                              }
                              placeholder={`Viết đôi dòng nhắn riêng cho cảm xúc của ${settings.herNickname}...`}
                              className="flex-1 px-3 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveDiaryReply(entry)}
                              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 min-h-[42px] sm:min-h-0 rounded-lg bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold cursor-pointer shrink-0"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu Lời Nhắn</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Preset Emotion Message Pools Editor */}
            <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
                  <span>
                    Kho Thông Điệp Cài Sẵn Theo 5 Biểu Tượng Cảm Xúc
                  </span>
                </h3>
                <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5">
                  Khi {settings.herNickname} vừa lưu nhật ký trong Trạm Lắng Nghe, một câu trong danh sách tương ứng với cảm xúc cô ấy chọn sẽ tự động hiển thị ngay lập tức để cô ấy luôn nhận được sự quan tâm tức thì.
                </p>
              </div>

              {/* 5 Emotion Selector Tabs */}
              <div className="grid grid-cols-2 min-[460px]:grid-cols-3 sm:grid-cols-5 gap-2.5">
                {MOOD_DIARY_EMOTIONS.map((emo) => {
                  const isSelected = selectedPresetEmotion === emo.key;
                  const count = (moodPresetConfig[emo.key] || []).length;
                  return (
                    <button
                      key={emo.key}
                      type="button"
                      onClick={() => setSelectedPresetEmotion(emo.key)}
                      className={`p-3 min-h-[54px] rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#E06D85] dark:border-[#E06D82] shadow-2xs'
                          : 'bg-[#FAF7F2] dark:bg-[#22191D] border-[#EEDDD8] dark:border-[#533D45] hover:bg-white dark:hover:bg-[#2E2227]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#3D3234] dark:text-[#F6EAEF]">
                        {emo.label}
                      </div>
                      <div className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-0.5 tabular-nums">
                        {count} câu cài sẵn
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add new preset message for selected emotion */}
              <form
                onSubmit={handleAddPresetMsg}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  value={newPresetMsg}
                  onChange={(e) => setNewPresetMsg(e.target.value)}
                  placeholder="Thêm một câu thông điệp tự động mới cho cảm xúc này..."
                  className="flex-1 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Câu Cài Sẵn</span>
                </button>
              </form>

              {/* Editable list of preset messages */}
              <div className="space-y-3">
                {currentPresetList.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-xl bg-[#FAF7F2] dark:bg-[#22191D] border border-[#EEDDD8] dark:border-[#533D45] flex items-start justify-between gap-2.5 sm:gap-3"
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-2">
                      <span className="font-semibold text-[#E06D85] dark:text-[#FF9EB0] text-xs mt-1.5 shrink-0">
                        #{idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        value={msg}
                        onChange={(e) =>
                          handleUpdatePresetMsg(idx, e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1B1417] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85] leading-relaxed"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePresetMsg(idx)}
                      className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-lg text-[#C94A63] dark:text-[#FF9EB0] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer shrink-0 mt-0.5 inline-flex items-center justify-center"
                      title="Xóa câu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Cài đặt Hệ Thống & Biệt Danh */}
        {activeTab === 'settings' && (
          <div className="bg-white/92 dark:bg-[#271D21]/90 rounded-2xl border border-[#EEDDD8] dark:border-[#4F3941] p-4 sm:p-6 shadow-xs max-w-3xl">
            <h2 className="text-base font-bold text-[#3D3234] dark:text-[#F6EAEF] mb-1 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#E06D85] dark:text-[#FF9EB0] shrink-0" />
              <span>Cài Đặt Danh Xưng &amp; Lời Tựa Góc Nhỏ</span>
            </h2>
            <p className="text-xs text-[#7E6E70] dark:text-[#C7B0B7] mb-6">
              Mọi thay đổi ở đây sẽ tự động cập nhật lên giao diện của Quỳnh Anh và Chatbot.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1.5">
                    Biệt danh của bạn (Người gửi)
                  </label>
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="X"
                    className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs font-bold text-[#E06D85] dark:text-[#FF9EB0] focus:outline-none focus:border-[#E06D85]"
                  />
                  <p className="text-[11px] text-[#7E6E70] dark:text-[#C7B0B7] mt-1">
                    Hiển thị ở nơi ký tên, tiêu đề Chatbot và lời nhắn gửi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1.5">
                    Tên gọi thân thương dành cho cô ấy
                  </label>
                  <input
                    type="text"
                    value={herNameInput}
                    onChange={(e) => setHerNameInput(e.target.value)}
                    placeholder="Quỳnh Anh"
                    className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1.5">
                  Lời chào mở đầu trên đầu trang của Quỳnh Anh
                </label>
                <textarea
                  rows={3}
                  value={welcomeInput}
                  onChange={(e) => setWelcomeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D3234] dark:text-[#F6EAEF] mb-1.5">
                  Lời nhắn nhỏ dưới chân trang (Footer)
                </label>
                <input
                  type="text"
                  value={footerInput}
                  onChange={(e) => setFooterInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FAF7F2] dark:bg-[#1E161A] border border-[#EEDDD8] dark:border-[#533D45] text-base sm:text-xs text-[#3D3234] dark:text-[#F6EAEF] focus:outline-none focus:border-[#E06D85]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#E06D85] hover:bg-[#D55C75] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Toàn Bộ Cài Đặt</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
