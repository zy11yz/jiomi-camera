import {
  useRef, useEffect, useState, useCallback
} from 'react'
import { ShootingMode, FrameAnalysis, Suggestion } from '../../config/types'
import { detectPose, getPoseDetector } from '../../vision/pose'
import { predictScene } from '../../vision/scene'
import { analyzeComposition } from '../../vision/composition'
import { analyzeLighting } from '../../vision/lighting'
import { rankSuggestions, resetEngineState } from '../../strategy/engine'
import { CapturedPhoto, extractFeatures, scorePhoto } from '../../postprocess/selector'
import { track } from '../../telemetry/tracker'
import GuidanceOverlay from '../overlay/GuidanceOverlay'
import styles from './CameraPage.module.css'

const MODE_HINTS: Record<ShootingMode, string> = {
  selfie: '自拍模式',
  portrait: '人像模式',
  food: '探店模式',
  travel: '旅行模式',
  night: '夜景模式',
}

interface Props {
  mode: ShootingMode
  onCapture: (photos: CapturedPhoto[]) => void
  onBack: () => void
}

export default function CameraPage({ mode, onCapture, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const captureBufferRef = useRef<CapturedPhoto[]>([])
  const analyzeLoopRef = useRef<number>(0)
  const lastAnalysisRef = useRef<number>(0)

  const [modelLoading, setModelLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<FrameAnalysis | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [captureCount, setCaptureCount] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    mode === 'selfie' ? 'user' : 'environment'
  )
  const streamRef = useRef<MediaStream | null>(null)

  // Start camera
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (e) {
      setCameraError('无法访问摄像头，请检查权限设置')
      console.error(e)
    }
  }, [])

  // Load model + start camera
  useEffect(() => {
    resetEngineState()
    setModelLoading(true)
    Promise.all([
      startCamera(facingMode),
      getPoseDetector(),
    ]).then(() => {
      setModelLoading(false)
    }).catch(e => {
      console.error(e)
      setModelLoading(false)
    })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      cancelAnimationFrame(analyzeLoopRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Analysis loop
  useEffect(() => {
    if (modelLoading) return

    const analyze = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        analyzeLoopRef.current = requestAnimationFrame(analyze)
        return
      }

      const now = Date.now()
      if (now - lastAnalysisRef.current < 80) { // ~12fps
        analyzeLoopRef.current = requestAnimationFrame(analyze)
        return
      }
      lastAnalysisRef.current = now

      const vw = video.videoWidth
      const vh = video.videoHeight
      canvas.width = vw
      canvas.height = vh
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, vw, vh)
      const imageData = ctx.getImageData(0, 0, Math.min(vw, 224), Math.min(vh, 224))

      try {
        const [poseResult, scenePred] = await Promise.all([
          detectPose(video),
          Promise.resolve(predictScene(imageData, mode === 'food' ? 'food' : mode === 'night' ? 'night' : undefined)),
        ])

        const composition = analyzeComposition(poseResult.subjectBox, poseResult.faceBox)
        const lighting = analyzeLighting(imageData, poseResult.faceBox)

        const analysis: FrameAnalysis = {
          scene: scenePred.scene,
          subject: poseResult.analysis.detected ? 'person' : 'none',
          pose: poseResult.analysis,
          composition,
          lighting,
          timestamp: now,
        }

        const ranked = rankSuggestions(analysis)
        setLatestAnalysis(analysis)
        setSuggestions(ranked)

        if (ranked.length > 0) {
          track('suggestion_shown', { ids: ranked.map(s => s.id) })
        }
      } catch (e) {
        console.error('Analysis error:', e)
      }

      analyzeLoopRef.current = requestAnimationFrame(analyze)
    }

    analyzeLoopRef.current = requestAnimationFrame(analyze)
    return () => cancelAnimationFrame(analyzeLoopRef.current)
  }, [modelLoading, mode])

  // Capture a single frame
  const captureFrame = useCallback((): CapturedPhoto | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null

    const cap = document.createElement('canvas')
    cap.width = canvas.width
    cap.height = canvas.height
    const ctx = cap.getContext('2d')!
    ctx.drawImage(video, 0, 0, cap.width, cap.height)

    const faceBox = latestAnalysis?.composition.faceBox ?? null
    const features = extractFeatures(cap, faceBox)
    const score = scorePhoto(features)

    return {
      dataUrl: cap.toDataURL('image/jpeg', 0.9),
      score,
      width: cap.width,
      height: cap.height,
      timestamp: Date.now(),
    }
  }, [latestAnalysis])

  // Burst capture (5 frames over 1s)
  const handleShutter = useCallback(async () => {
    if (capturing) return
    setCapturing(true)
    captureBufferRef.current = []

    const frames: CapturedPhoto[] = []
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 200))
      const photo = captureFrame()
      if (photo) {
        frames.push(photo)
        setCaptureCount(i + 1)
        track('photo_captured', { index: i, score: photo.score })
      }
    }

    captureBufferRef.current = frames
    onCapture(frames)
  }, [capturing, captureFrame, onCapture])

  const handleFlipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    await startCamera(next)
  }

  if (cameraError) {
    return (
      <div className={styles.errorScreen}>
        <span>⚠️</span>
        <p>{cameraError}</p>
        <button onClick={onBack} className={styles.backBtn}>返回</button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Video */}
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        muted
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />
      <canvas ref={canvasRef} className={styles.hidden} />

      {/* Composition grid */}
      {showGrid && <div className={styles.grid} />}

      {/* Pose + subject overlay */}
      {latestAnalysis && (
        <GuidanceOverlay
          analysis={latestAnalysis}
          facingMode={facingMode}
          overlayCanvasRef={overlayCanvasRef}
        />
      )}

      {/* Loading */}
      {modelLoading && (
        <div className={styles.loadingBadge}>
          <span className={styles.spinner} />
          加载 AI 模型中…
        </div>
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={onBack} aria-label="返回">
          ✕
        </button>
        <span className={styles.modeLabel}>{MODE_HINTS[mode]}</span>
        <button
          className={styles.iconBtn}
          onClick={() => setShowGrid(g => !g)}
          aria-label="构图辅助线"
          style={{ opacity: showGrid ? 1 : 0.5 }}
        >
          ⊞
        </button>
      </div>

      {/* Suggestions */}
      <div className={styles.suggestionsArea}>
        {suggestions.slice(0, 1).map(s => (
          <div key={s.id} className={styles.suggestion} data-priority={s.priority}>
            <span className={styles.suggestionEmoji}>{s.emoji}</span>
            <span className={styles.suggestionText}>{s.text}</span>
          </div>
        ))}
      </div>

      {/* Scene tag */}
      {latestAnalysis && !modelLoading && (
        <div className={styles.sceneTag}>
          {latestAnalysis.scene}
        </div>
      )}

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <button className={styles.flipBtn} onClick={handleFlipCamera} aria-label="翻转镜头">
          🔄
        </button>
        <button
          className={styles.shutterBtn}
          onClick={handleShutter}
          disabled={capturing}
          aria-label="拍照"
        >
          {capturing ? (
            <span className={styles.captureProgress}>{captureCount}/5</span>
          ) : (
            <span className={styles.shutterInner} />
          )}
        </button>
        <div style={{ width: 48 }} />
      </div>
    </div>
  )
}
