import { SceneType } from '../config/types'

export interface StylePreset {
  id: string
  name: string
  description: string
  filter: string   // CSS filter string
  overlayColor?: string
  overlayOpacity?: number
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'original',
    name: '原图',
    description: '保持原始效果',
    filter: 'none',
  },
  {
    id: 'portrait_soft',
    name: '柔和人像',
    description: '肤色柔和，适合人像',
    filter: 'brightness(1.05) contrast(0.95) saturate(1.1) hue-rotate(-5deg)',
  },
  {
    id: 'cafe_warm',
    name: '咖啡暖调',
    description: '暖色调，适合探店',
    filter: 'sepia(0.3) brightness(1.08) saturate(1.2) contrast(1.05)',
  },
  {
    id: 'street_cool',
    name: '街拍冷调',
    description: '清冷色调，适合街拍',
    filter: 'brightness(1.02) contrast(1.1) saturate(0.85) hue-rotate(10deg)',
  },
  {
    id: 'night_neon',
    name: '霓虹夜景',
    description: '提亮暗部，适合夜景',
    filter: 'brightness(1.3) contrast(1.2) saturate(1.4)',
  },
  {
    id: 'travel_fresh',
    name: '旅行清新',
    description: '清新明亮，适合旅行',
    filter: 'brightness(1.1) contrast(0.98) saturate(1.25) hue-rotate(-3deg)',
  },
]

export function getRecommendedStyles(scene: SceneType): StylePreset[] {
  const sceneMap: Record<SceneType, string[]> = {
    portrait: ['portrait_soft', 'original', 'cafe_warm'],
    cafe: ['cafe_warm', 'portrait_soft', 'original'],
    street: ['street_cool', 'original', 'travel_fresh'],
    night: ['night_neon', 'street_cool', 'original'],
    travel: ['travel_fresh', 'original', 'cafe_warm'],
    backlight: ['portrait_soft', 'original', 'travel_fresh'],
    indoor: ['portrait_soft', 'cafe_warm', 'original'],
    food: ['cafe_warm', 'travel_fresh', 'original'],
    group: ['original', 'travel_fresh', 'cafe_warm'],
  }

  const ids = sceneMap[scene] ?? ['original', 'portrait_soft', 'cafe_warm']
  return ids.map(id => STYLE_PRESETS.find(s => s.id === id)!).filter(Boolean)
}
