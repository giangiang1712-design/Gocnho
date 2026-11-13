import { CloudSun, Coffee, Feather, Sparkles, Sun } from 'lucide-react';
import type { MoodDiaryEmotion } from './types';

export function getEmotionVisual(emotion: MoodDiaryEmotion) {
  switch (emotion) {
    case 'radiant':
      return {
        Icon: Sun,
        colorClass: 'text-[#E09F24] dark:text-[#F4C96B]',
        bgClass:
          'bg-[#FFF8E1] dark:bg-[#3A2E1B] border-[#FFE08A] dark:border-[#6A532B]',
        activeClass:
          'bg-[#FFF3C4] dark:bg-[#4B3B20] border-[#E09F24] dark:border-[#F4C96B] text-[#8F610B] dark:text-[#F9DF9F]',
      };
    case 'peaceful':
      return {
        Icon: CloudSun,
        colorClass: 'text-[#4A8BC2] dark:text-[#8BC4F5]',
        bgClass:
          'bg-[#EAF4FF] dark:bg-[#233242] border-[#BDE0FE] dark:border-[#3E5C78]',
        activeClass:
          'bg-[#D6ECFF] dark:bg-[#2B3F54] border-[#4A8BC2] dark:border-[#8BC4F5] text-[#285B85] dark:text-[#B9DCFA]',
      };
    case 'tired':
      return {
        Icon: Coffee,
        colorClass: 'text-[#D95B72] dark:text-[#FF9EB0]',
        bgClass:
          'bg-[#FFF0F3] dark:bg-[#3F2831] border-[#FFCCD5] dark:border-[#6A4250]',
        activeClass:
          'bg-[#FFE0E6] dark:bg-[#4F303C] border-[#D95B72] dark:border-[#FF9EB0] text-[#9E354A] dark:text-[#FFD0DA]',
      };
    case 'busy':
      return {
        Icon: Sparkles,
        colorClass: 'text-[#8B5CF6] dark:text-[#C4A6FF]',
        bgClass:
          'bg-[#F5EBFF] dark:bg-[#312540] border-[#DEC9F9] dark:border-[#564170]',
        activeClass:
          'bg-[#EBD9FF] dark:bg-[#3F2F54] border-[#8B5CF6] dark:border-[#C4A6FF] text-[#5B34B5] dark:text-[#DEC9FF]',
      };
    case 'thoughtful':
    default:
      return {
        Icon: Feather,
        colorClass: 'text-[#2E7D5B] dark:text-[#7AD3A4]',
        bgClass:
          'bg-[#E8F8EE] dark:bg-[#1E362A] border-[#BDE8CB] dark:border-[#39624D]',
        activeClass:
          'bg-[#D3F2DF] dark:bg-[#264737] border-[#2E7D5B] dark:border-[#7AD3A4] text-[#1B5E40] dark:text-[#A9E9C6]',
      };
  }
}
