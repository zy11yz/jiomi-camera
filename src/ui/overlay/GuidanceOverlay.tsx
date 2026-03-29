import { useEffect, RefObject } from 'react'
import { FrameAnalysis } from '../../config/types'

interface Props {
  analysis: FrameAnalysis
  facingMode: 'user' | 'environment'
  overlayCanvasRef: RefObject<HTMLCanvasElement>
}

export default function GuidanceOverlay({ analysis, facingMode, overlayCanvasRef }: Props) {
  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const w = canvas.width
    const h = canvas.height

    const mirror = facingMode === 'user'

    // Draw pose keypoints
    if (analysis.pose.detected) {
      const kps = analysis.pose.keypoints.filter(k => k.score > 0.3)

      ctx.fillStyle = 'rgba(80, 200, 120, 0.85)'
      for (const kp of kps) {
        const x = mirror ? (1 - kp.x) * w : kp.x * w
        const y = kp.y * h
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Skeleton connections
      const connections: [string, string][] = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle'],
        ['left_eye', 'right_eye'],
        ['left_eye', 'nose'],
        ['right_eye', 'nose'],
      ]

      ctx.strokeStyle = 'rgba(80, 200, 120, 0.6)'
      ctx.lineWidth = 2
      const kpMap = Object.fromEntries(kps.map(k => [k.name, k]))
      for (const [a, b] of connections) {
        const ka = kpMap[a]
        const kb = kpMap[b]
        if (!ka || !kb) continue
        const ax = mirror ? (1 - ka.x) * w : ka.x * w
        const bx = mirror ? (1 - kb.x) * w : kb.x * w
        ctx.beginPath()
        ctx.moveTo(ax, ka.y * h)
        ctx.lineTo(bx, kb.y * h)
        ctx.stroke()
      }
    }

    // Draw subject bounding box
    if (analysis.composition.subjectBox) {
      const box = analysis.composition.subjectBox
      const bx = mirror ? (1 - box.x - box.w) * w : box.x * w
      const by = box.y * h
      const bw = box.w * w
      const bh = box.h * h

      ctx.strokeStyle = 'rgba(245, 197, 24, 0.7)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.strokeRect(bx, by, bw, bh)
      ctx.setLineDash([])
    }

    // Draw face box
    if (analysis.composition.faceBox) {
      const fb = analysis.composition.faceBox
      const fx = mirror ? (1 - fb.x - fb.w) * w : fb.x * w
      const fy = fb.y * h
      const fw = fb.w * w
      const fh = fb.h * h

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 1.5
      // Corner bracket style
      const cl = Math.min(fw, fh) * 0.25
      ctx.beginPath()
      // top-left
      ctx.moveTo(fx + cl, fy)
      ctx.lineTo(fx, fy)
      ctx.lineTo(fx, fy + cl)
      // top-right
      ctx.moveTo(fx + fw - cl, fy)
      ctx.lineTo(fx + fw, fy)
      ctx.lineTo(fx + fw, fy + cl)
      // bottom-left
      ctx.moveTo(fx, fy + fh - cl)
      ctx.lineTo(fx, fy + fh)
      ctx.lineTo(fx + cl, fy + fh)
      // bottom-right
      ctx.moveTo(fx + fw - cl, fy + fh)
      ctx.lineTo(fx + fw, fy + fh)
      ctx.lineTo(fx + fw, fy + fh - cl)
      ctx.stroke()
    }
  }, [analysis, facingMode, overlayCanvasRef])

  return (
    <canvas
      ref={overlayCanvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}
