import { useState } from 'react'
import { CapturedPhoto, selectBestShots } from '../../postprocess/selector'
import { getRecommendedStyles, StylePreset } from '../../postprocess/styles'
import { ShootingMode, SceneType } from '../../config/types'
import { track } from '../../telemetry/tracker'
import styles from './ResultsPage.module.css'

const MODE_TO_SCENE: Record<ShootingMode, SceneType> = {
  selfie: 'portrait',
  portrait: 'portrait',
  food: 'food',
  travel: 'travel',
  night: 'night',
}

interface Props {
  photos: CapturedPhoto[]
  mode: ShootingMode
  onRetake: () => void
  onHome: () => void
}

export default function ResultsPage({ photos, mode, onRetake, onHome }: Props) {
  const scene = MODE_TO_SCENE[mode]
  const bestShots = selectBestShots(photos)
  const recommended = getRecommendedStyles(scene)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(recommended[0])
  const [saved, setSaved] = useState(false)

  const current = bestShots[selectedIdx]

  const handleSave = () => {
    if (!current) return
    track('photo_saved', {
      score: current.score,
      styleId: selectedStyle.id,
      index: selectedIdx,
    })

    // Download the image
    const link = document.createElement('a')
    link.download = `jiomi-${Date.now()}.jpg`
    // Apply CSS filter via canvas
    const img = new Image()
    img.onload = () => {
      const cap = document.createElement('canvas')
      cap.width = img.width
      cap.height = img.height
      const ctx = cap.getContext('2d')!
      ctx.filter = selectedStyle.filter === 'none' ? '' : selectedStyle.filter
      ctx.drawImage(img, 0, 0)
      link.href = cap.toDataURL('image/jpeg', 0.92)
      link.click()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    img.src = current.dataUrl
  }

  const handleStyleChange = (preset: StylePreset) => {
    setSelectedStyle(preset)
    track('style_applied', { styleId: preset.id })
  }

  if (bestShots.length === 0) {
    return (
      <div className={styles.empty}>
        <p>没有捕获到照片</p>
        <button onClick={onRetake} className={styles.btn}>重新拍摄</button>
      </div>
    )
  }

  track('best_shot_viewed', { count: bestShots.length })

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.textBtn} onClick={onHome}>首页</button>
        <span className={styles.title}>选片结果</span>
        <button className={styles.textBtn} onClick={onRetake}>重拍</button>
      </div>

      {/* Main photo */}
      <div className={styles.mainPhoto}>
        {current && (
          <img
            src={current.dataUrl}
            alt="拍摄照片"
            className={styles.photo}
            style={{ filter: selectedStyle.filter === 'none' ? undefined : selectedStyle.filter }}
          />
        )}
        {current?.label && (
          <div className={styles.photoLabel}>{current.label}</div>
        )}
        {current && (
          <div className={styles.scoreBar}>
            <span className={styles.scoreLabel}>评分</span>
            <div className={styles.scoreTrack}>
              <div
                className={styles.scoreFill}
                style={{ width: `${Math.round(current.score * 100)}%` }}
              />
            </div>
            <span className={styles.scoreValue}>{Math.round(current.score * 100)}</span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className={styles.thumbRow}>
        {bestShots.map((p, i) => (
          <button
            key={p.timestamp}
            className={`${styles.thumb} ${i === selectedIdx ? styles.thumbActive : ''}`}
            onClick={() => setSelectedIdx(i)}
          >
            <img src={p.dataUrl} alt={`照片 ${i + 1}`} />
            <span className={styles.thumbLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Style presets */}
      <div className={styles.styleSection}>
        <h3 className={styles.styleTitle}>风格滤镜</h3>
        <div className={styles.styleRow}>
          {recommended.map(preset => (
            <button
              key={preset.id}
              className={`${styles.styleBtn} ${selectedStyle.id === preset.id ? styles.styleBtnActive : ''}`}
              onClick={() => handleStyleChange(preset)}
            >
              <div
                className={styles.stylePreview}
                style={{
                  backgroundImage: current ? `url(${current.dataUrl})` : undefined,
                  filter: preset.filter === 'none' ? undefined : preset.filter,
                }}
              />
              <span className={styles.styleName}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className={styles.actions}>
        <button className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`} onClick={handleSave}>
          {saved ? '✓ 已保存' : '保存到相册'}
        </button>
      </div>
    </div>
  )
}
