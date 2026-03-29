import { useState } from 'react'
import HomePage from './ui/pages/HomePage'
import CameraPage from './ui/pages/CameraPage'
import ResultsPage from './ui/pages/ResultsPage'
import { ShootingMode } from './config/types'
import { CapturedPhoto } from './postprocess/selector'

type AppPage = 'home' | 'camera' | 'results'

export default function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [mode, setMode] = useState<ShootingMode>('portrait')
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])

  const handleModeSelect = (m: ShootingMode) => {
    setMode(m)
    setPage('camera')
  }

  const handlePhotoCaptured = (shots: CapturedPhoto[]) => {
    setPhotos(shots)
    setPage('results')
  }

  const handleRetake = () => {
    setPhotos([])
    setPage('camera')
  }

  const handleHome = () => {
    setPhotos([])
    setPage('home')
  }

  return (
    <>
      {page === 'home' && <HomePage onSelectMode={handleModeSelect} />}
      {page === 'camera' && (
        <CameraPage
          mode={mode}
          onCapture={handlePhotoCaptured}
          onBack={handleHome}
        />
      )}
      {page === 'results' && (
        <ResultsPage
          photos={photos}
          mode={mode}
          onRetake={handleRetake}
          onHome={handleHome}
        />
      )}
    </>
  )
}
