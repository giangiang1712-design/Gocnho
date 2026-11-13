import type {
  AppSettings,
  ChatMessage,
  ExternalGameItem,
  MoodDiaryEmotion,
  MoodDiaryEntry,
  MoodJarItem,
  MoodPresetConfig,
  MusicTrackItem,
  PolaroidPhoto,
  WishOption,
} from './types';

export const SEED_POLAROID_PHOTOS: PolaroidPhoto[] = [
  {
    id: 'seed-photo-1',
    imageUrl: '/src/assets/images/polaroid_blossom_stroll_1794299715968.jpg',
    caption:
      'Giữa một chiều ngập nắng, thần thái dịu dàng này làm người đối diện cũng thấy bình yên lây.',
    story:
      'Có những khoảnh khắc nhìn rất đỗi tự nhiên nhưng lại có sức hút kỳ lạ. Nắng chiều hôm ấy rất đẹp, nhưng chính năng lượng nhẹ nhàng, trong trẻo của cậu mới là điều làm tớ thấy bức ảnh này đáng nhớ nhất.',
    date: '14.03.2026',
    emotionTag: '#NụCườiToảNắng',
    likes: 28,
    isLiked: true,
    rotation: -1.5,
    featured: true,
    createdAt: 1794299715000,
  },
  {
    id: 'seed-photo-2',
    imageUrl: '/src/assets/images/polaroid_sunlit_cafe_1794299714748.jpg',
    caption:
      'Một ly matcha dâu tây ở góc quán nhỏ cho những ngày Quỳnh Anh cần khoảng lặng.',
    story:
      'Ai rồi cũng có những ngày lịch trình dày đặc và chỉ muốn tìm một góc bàn gỗ có nắng chiếu qua để thở phào một nhịp. Tớ mong rằng mỗi khi ghé vào đây, cậu cũng tìm thấy cảm giác thư thái hệt như buổi chiều ở quán nhỏ này.',
    date: '22.04.2026',
    emotionTag: '#NgàyDịuDàng',
    likes: 19,
    isLiked: false,
    rotation: 1.2,
    createdAt: 1794299714000,
  },
  {
    id: 'seed-photo-3',
    imageUrl: '/src/assets/images/polaroid_pastel_sunset_1794299716406.jpg',
    caption:
      'Bầu trời hoàng hôn màu hồng phấn — dịu mắt hệt như cách Quỳnh Anh cười vậy.',
    story:
      'Người ta hay bảo hoàng hôn là phần thưởng dịu dàng nhất sau một ngày dài. Tớ lưu lại sắc trời êm ả này ở đây để bất cứ khi nào cậu thấy ngày hôm nay hơi vội vã, cứ nhìn lên mây trời và thả lỏng một chút nhé.',
    date: '09.06.2026',
    emotionTag: '#GócBìnhYên',
    likes: 34,
    isLiked: true,
    rotation: -1.1,
    createdAt: 1794299713000,
  },
  {
    id: 'seed-photo-4',
    imageUrl: '/src/assets/images/polaroid_cozy_reading_1794299718942.jpg',
    caption:
      'Một tách trà ấm, vài trang sách hay và một buổi chiều không vướng bận.',
    story:
      'Những ngày cuối tuần chẳng cần đi đâu xa, chỉ cần ngồi cạnh khung cửa sổ sáng, nghe một giai điệu nhẹ nhàng và tận hưởng thế giới riêng của mình. Cậu cứ thoải mái là chính mình nhé, mọi ồn ào ngoài kia cứ để lại sau cánh cửa.',
    date: '18.08.2026',
    emotionTag: '#TrongTrẻo',
    likes: 24,
    isLiked: false,
    rotation: 1.4,
    createdAt: 1794299712000,
  },
  {
    id: 'seed-photo-5',
    imageUrl: '/src/assets/images/polaroid_pink_tulips_1794299719332.jpg',
    caption:
      'Bó tulip hồng phấn gửi vào góc nhỏ để ngày của Quỳnh Anh luôn tươi tắn.',
    story:
      'Hoa tulip hồng mang ý nghĩa của sự trân trọng và lời chúc tốt lành giản đơn. Hy vọng mỗi lần lướt qua bức hình này, cậu sẽ bất giác mỉm cười vì luôn có tớ âm thầm cổ vũ cho những điều tốt đẹp đến với cậu.',
    date: '02.10.2026',
    emotionTag: '#KhoảnhKhắcĐẹp',
    likes: 41,
    isLiked: true,
    rotation: -0.9,
    createdAt: 1794299711000,
  },
  {
    id: 'seed-photo-6',
    imageUrl: '/src/assets/images/polaroid_evening_glow_1794299725863.jpg',
    caption:
      'Ánh đèn vàng ấm áp sau cơn mưa chiều — như một trạm dừng chân luôn mở cửa.',
    story:
      'Nếu có hôm nào tan học hay tan làm muộn mà lòng thấy hơi chùng xuống, đừng quên góc nhỏ này vẫn luôn sáng đèn. Ghé xuống Trạm Lắng Nghe bên dưới và kể vài chuyện vụn vặt trong ngày với tớ cho nhẹ lòng nhé Quỳnh Anh.',
    date: '05.11.2026',
    emotionTag: '#GócBìnhYên',
    likes: 31,
    isLiked: false,
    rotation: 1.1,
    createdAt: 1794299710000,
  },
];

export const DEFAULT_MOOD_JARS: MoodJarItem[] = [
  {
    id: 'jar-happy',
    moodKey: 'happy',
    title: 'Hũ Niềm Vui',
    subtitle: 'Khi cậu đang có chuyện vui',
    accentHex: '#FF8FA3',
    bgHex: '#FFF0F3',
    messages: [
      'Nụ cười của Quỳnh Anh có sức lan tỏa rất tích cực đấy. Hôm nay có chuyện gì thú vị nhớ ghé xuống Trạm Lắng Nghe kể cho tớ nghe với nhé!',
      'Giữ trọn nguồn năng lượng rạng rỡ này nhé cậu. Nhìn một người luôn giữ được nét tươi tắn như Quỳnh Anh thật sự làm tớ thấy rất vui lây.',
      'Thêm một ngày vui vẻ được cất vào sổ lưu niệm. Tớ chúc cho những ngày sắp tới của cậu cũng luôn ngập tràn những điều nhỏ xinh như hôm nay.',
    ],
  },
  {
    id: 'jar-tired',
    moodKey: 'tired',
    title: 'Hũ Nghỉ Ngơi',
    subtitle: 'Khi hôm nay hơi dài và thấm mệt',
    accentHex: '#E5989B',
    bgHex: '#FDECEF',
    messages: [
      'Hôm nay cậu đã vất vả nhiều rồi. Tạm gác công việc sang một bên, uống một ngụm nước ấm và cho phép bản thân nghỉ ngơi sớm hơn mọi ngày một chút nhé.',
      'Chẳng sao cả nếu hôm nay mình đi chậm lại một nhịp đâu Quỳnh Anh. Nghe một bản nhạc êm dịu rồi chợp mắt một lát cho lại sức nhé.',
      'Mệt thì cứ than một câu với tớ ở Trạm Lắng Nghe bên dưới nhé, cậu không cần lúc nào cũng phải tự gồng mình một mình đâu.',
    ],
  },
  {
    id: 'jar-stressed',
    moodKey: 'stressed',
    title: 'Hũ Bình Tĩnh',
    subtitle: 'Khi nhiều việc ngổn ngang trong đầu',
    accentHex: '#D88C9A',
    bgHex: '#FCE8ED',
    messages: [
      'Mọi việc rồi sẽ tháo gỡ được từng chút một thôi Quỳnh Anh ạ. Hít một hơi thật sâu nào, sự chỉn chu và cố gắng của cậu vốn đã rất đáng nể trong mắt tớ rồi.',
      'Đừng tự tạo áp lực phải hoàn hảo trong mọi chuyện nhé. Cứ làm hết sức theo nhịp độ của riêng cậu là tuyệt vời nhất rồi.',
      'Những chuyện làm mình đau đầu hôm nay, vài tuần nữa nhìn lại sẽ chỉ là chuyện nhỏ xíu thôi. Bình tĩnh và tin vào bản thân nhé, tớ luôn ủng hộ cậu!',
    ],
  },
  {
    id: 'jar-missing',
    moodKey: 'missing',
    title: 'Hũ Nạp Năng Lượng',
    subtitle: 'Khi lòng chợt thấy chùng xuống',
    accentHex: '#FF758F',
    bgHex: '#FFE5EC',
    messages: [
      'Góc nhỏ này tớ tạo ra là để những lúc thấy trống trải hay lười nói chuyện với thế giới ngoài kia, cậu vẫn có một nơi thật sự thoải mái để ghé về.',
      'Nếu hôm nay tâm trạng hơi lưng chừng, tự thưởng cho mình một món đồ uống ngọt dịu hoặc một buổi đi dạo hóng gió xem sao nhé Quỳnh Anh.',
      'Dù hôm nay thời tiết hay mọi thứ xung quanh có hơi ảm đạm, hãy nhớ rằng luôn có tớ ở đây trân trọng sự hiện diện dịu dàng của cậu.',
    ],
  },
];

export const DEFAULT_WISH_OPTIONS: WishOption[] = [
  {
    id: 'wish-milktea',
    title: 'Một ly trà sữa ngọt dịu',
    subtitle: 'Ít đá, thêm trân châu trắng giòn',
    category: 'Đồ ngọt chữa lành',
  },
  {
    id: 'wish-walk',
    title: 'Đi dạo phố chiều mát',
    subtitle: 'Ngắm hoàng hôn và hít thở gió trời',
    category: 'Không gian thoáng đãng',
  },
  {
    id: 'wish-music',
    title: 'Nghe một bản Acoustic',
    subtitle: 'Giai điệu nhẹ nhàng thư giãn đầu óc',
    category: 'Khoảnh khắc bình yên',
  },
  {
    id: 'wish-listen',
    title: 'Một người bạn kiên nhẫn lắng nghe',
    subtitle: 'Trò chuyện thoải mái không áp lực',
    category: 'Chia sẻ tâm sự',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  herNickname: 'Quỳnh Anh',
  senderAlias: 'X',
  welcomeNote:
    'Chào mừng Quỳnh Anh ghé thăm Góc Nhỏ Chữa Lành. Ngoài kia nếu có những lúc bận rộn hay mệt mỏi, cậu cứ thong thả dạo xem những bức hình thật xinh và trò chuyện cùng tớ ở Trạm Lắng Nghe bên dưới nhé.',
  anniversaryDate: '2026-11-10',
  secretHeaderNote:
    'Một không gian nhỏ bình yên tớ dành tặng riêng cho Quỳnh Anh',
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg-1',
    sender: 'thanh',
    text: 'Chào Quỳnh Anh. Hôm nay mọi thứ với cậu êm chứ, hay đang có chuyện gì khiến cậu muốn kể cho nhẹ đầu một chút không?',
    timestamp: 'Hôm nay',
  },
];

export const DEFAULT_MUSIC_TRACKS: MusicTrackItem[] = [];

export const DEFAULT_EXTERNAL_GAMES: ExternalGameItem[] = [];

export const MOOD_DIARY_EMOTIONS: {
  key: MoodDiaryEmotion;
  label: string;
  shortLabel: string;
  subtitle: string;
}[] = [
  {
    key: 'radiant',
    label: 'Nắng Ấm Rạng Rỡ',
    shortLabel: 'Nắng Ấm',
    subtitle: 'Vui vẻ, có chuyện đáng yêu',
  },
  {
    key: 'peaceful',
    label: 'Dịu Êm Bình Yên',
    shortLabel: 'Dịu Êm',
    subtitle: 'Nhẹ nhàng, thư thái',
  },
  {
    key: 'tired',
    label: 'Hơi Thấm Mệt',
    shortLabel: 'Chùng Xuống',
    subtitle: 'Cần nghỉ ngơi nạp năng lượng',
  },
  {
    key: 'busy',
    label: 'Nhiều Việc Bận Rộn',
    shortLabel: 'Nhiều Việc',
    subtitle: 'Deadline hoặc lịch trình dày',
  },
  {
    key: 'thoughtful',
    label: 'Nhiều Tâm Sự Nhỏ',
    shortLabel: 'Muốn Kể',
    subtitle: 'Có điều bâng khuâng muốn sẻ chia',
  },
];

export const DEFAULT_MOOD_PRESET_CONFIG: MoodPresetConfig = {
  radiant: [
    'Thấy Quỳnh Anh có một ngày rạng rỡ thế này làm tớ cũng vui lây cả buổi tối đấy! Giữ mãi nguồn năng lượng tươi tắn này nhé cậu.',
    'Một ngày ngập nắng ấm đã được cất vào nhật ký. Mong mỗi ngày sắp tới của Quỳnh Anh đều có thêm thật nhiều lý do để mỉm cười như hôm nay nhé!',
    'Nụ cười của cậu chính là điều dịu dàng nhất ở góc nhỏ này đấy. Có chuyện gì vui nhớ kể thêm cho tớ nghe với nha!',
  ],
  peaceful: [
    'Những ngày bình yên, thong thả thế này thật sự rất đáng quý. Cứ tận hưởng nhịp sống êm đềm của riêng cậu nhé Quỳnh Anh.',
    'Thật mừng vì hôm nay của Quỳnh Anh trôi qua nhẹ nhàng. Tối nay nghe một bản nhạc êm rồi ngủ thật ngon nhé cậu!',
    'Không cần ồn ào vội vã, chỉ cần lòng cậu thấy dễ chịu và thư thái như lúc này là tuyệt vời nhất rồi.',
  ],
  tired: [
    'Hôm nay Quỳnh Anh đã cố gắng nhiều rồi. Tạm gác mọi thứ sang một bên, uống ngụm nước ấm và cho phép mình nghỉ ngơi sớm hơn mọi ngày nhé!',
    'Nếu thấy thấm mệt thì đừng cố gồng thêm nữa nha cậu. Góc nhỏ này và tớ luôn ở đây để cậu thả lỏng bất cứ lúc nào.',
    'Một cái vỗ về dịu dàng gửi tới cậu. Ngủ một giấc thật sâu, sáng mai thức dậy mọi mệt mỏi sẽ nhẹ bớt đi nhiều đấy Quỳnh Anh ơi.',
  ],
  busy: [
    'Ngày nhiều việc vất vả cho Quỳnh Anh quá! Cứ làm từng chút một thôi nhé, tớ luôn âm thầm cổ vũ cho cậu hoàn thành thật tốt mọi kế hoạch.',
    'Lịch trình dày đặc thế nào cũng nhớ ăn uống đúng bữa và duỗi vai nghỉ vài phút nha Quỳnh Anh, đừng để bản thân bị quá tải nhé!',
    'Cậu làm tốt lắm rồi! Xong việc hôm nay nhớ tự thưởng cho mình một món ngon hoặc một ly trà sữa ít ngọt nhé.',
  ],
  thoughtful: [
    'Dù là chuyện nhỏ xíu hay những điều khó gọi tên, tớ vẫn luôn ở ngay đây lắng nghe Quỳnh Anh mà. Đừng giữ trong lòng một mình nhé!',
    'Những lúc lòng hơi nhiều suy nghĩ, cậu cứ viết ra đây hoặc nhắn qua tab Trò Chuyện cho tớ nhé. Mọi tâm sự của cậu đều được trân trọng.',
    'Thở chậm lại một nhịp nào Quỳnh Anh ơi. Mọi chuyện rồi sẽ êm xuôi cả thôi, tớ luôn đứng về phía cậu.',
  ],
};

export const INITIAL_MOOD_DIARY_ENTRIES: MoodDiaryEntry[] = [
  {
    id: 'diary-seed-1',
    emotion: 'peaceful',
    emotionLabel: 'Dịu Êm Bình Yên',
    shortNote:
      'Ghé vào góc nhỏ nghe tiếng nhạc êm và ngắm lại mấy bức ảnh kỷ niệm thấy lòng nhẹ nhàng hẳn.',
    presetMessage:
      'Những ngày bình yên, thong thả thế này thật sự rất đáng quý. Cứ tận hưởng nhịp sống êm đềm của riêng cậu nhé Quỳnh Anh.',
    customAdminReply:
      'Bất cứ khi nào cậu cần một khoảng lặng dịu dàng, cứ mở cuốn sổ nhỏ này lên nhé. Tớ luôn để sẵn những điều ấm áp ở đây đợi cậu!',
    createdAt: 'Hôm nay · 20:15',
    timestamp: 1794300000000,
  },
];
