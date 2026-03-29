import { ShootingMode } from '../../config/types'
import styles from './HomePage.module.css'
import { track } from '../../telemetry/tracker'
import { useEffect } from 'react'

interface ModeConfig {
  id: ShootingMode
  emoji: string
  title: string
  desc: string
}

const MODES: ModeConfig[] = [
  { id: 'selfie',   emoji: '🤳', title: '自拍',   desc: '美颜+构图引导' },
  { id: 'portrait', emoji: '👤', title: '人像',   desc: '姿势+光线建议' },
  { id: 'food',     emoji: '🍽️', title: '探店',   desc: '色调+取景优化' },
  { id: 'travel',   emoji: '🌍', title: '旅行',   desc: '场景识别+构图' },
  { id: 'night',    emoji: '🌃', title: '夜景',   desc: '暗光提升+稳定' },
]

interface Props {
  onSelectMode: (mode: ShootingMode) => void
}

export default function HomePage({ onSelectMode }: Props) {
  useEffect(() => {
    track('session_start')
  }, [])

  const handleSelect = (mode: ShootingMode) => {
    track('mode_selected', { mode })
    onSelectMode(mode)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📷</span>
          <span className={styles.logoText}>Jiomi Camera</span>
        </div>
        <p className={styles.tagline}>AI 驱动的拍摄助手</p>
      </header>

      <main className={styles.main}>
        <h2 className={styles.sectionTitle}>选择拍摄模式</h2>
        <div className={styles.grid}>
          {MODES.map(m => (
            <button key={m.id} className={styles.card} onClick={() => handleSelect(m.id)}>
              <span className={styles.cardEmoji}>{m.emoji}</span>
              <span className={styles.cardTitle}>{m.title}</span>
              <span className={styles.cardDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>实时 AI 分析 · 姿势指导 · 自动选片</p>
      </footer>
    </div>
  )
}
