import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

type Props = { onResult: (code: string) => void; onClose: () => void }

// Why the camera can't start, in plain words.
function cameraError(err: unknown) {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError') return 'Camera permission is blocked. Allow the camera for this site (lock icon in the address bar), then try again.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found on this device. Use the scanner gun or type the code.'
  if (name === 'NotReadableError') return 'The camera is being used by another app (or is still closing). Wait a second and press Try again.'
  return 'Could not start the camera. Use the scanner gun or type the code.'
}

// Switch the camera fully off: stop every track and detach it from the video (else the next scan can stay black).
// Only this run's own stream is touched — a newer scan may already own the video.
function release(video: HTMLVideoElement | null, stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
  if (video && stream && video.srcObject === stream) {
    video.pause()
    video.srcObject = null
  }
}

// Scan a barcode with the phone / tablet / laptop camera (EAN-13, Code 128 … — the 1D codes on labels).
// We open the camera ourselves (so we can always switch it off) and let the reader library only read the video.
export function CameraScanModal({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const done = useRef(false)
  const resultRef = useRef(onResult)
  // Browsers allow the camera only on https or on this PC (localhost) — checked before trying.
  const insecure = typeof window !== 'undefined' && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
  const [error, setError] = useState(insecure ? 'The camera works only on this PC (localhost) or over https. On this connection use the scanner gun or type the code.' : '')
  const [starting, setStarting] = useState(!insecure)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    resultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    if (insecure) return
    const video = videoRef.current
    let stream: MediaStream | null = null
    let stopReader: (() => void) | undefined
    let cancelled = false
    done.current = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }) // back camera on phones
        if (cancelled || !video) return release(video, stream)
        video.srcObject = stream
        await video.play()
        const { BrowserMultiFormatOneDReader } = await import('@zxing/browser')
        if (cancelled) return release(video, stream)
        const controls = await new BrowserMultiFormatOneDReader().decodeFromVideoElement(video, (result) => {
          if (!result || done.current) return
          done.current = true
          navigator.vibrate?.(80)
          stopReader?.()
          release(video, stream)
          resultRef.current(result.getText().trim())
        })
        stopReader = () => controls.stop()
        if (cancelled) { stopReader(); release(video, stream) } else setStarting(false)
      } catch (err) {
        release(video, stream)
        if (!cancelled) { setError(cameraError(err)); setStarting(false) }
      }
    })()
    return () => {
      cancelled = true
      stopReader?.()
      release(video, stream)
    }
  }, [insecure, attempt])

  const retry = () => { setError(''); setStarting(true); setAttempt((a) => a + 1) }

  return (
    <Modal
      open
      onClose={onClose}
      title="Scan barcode"
      description="Hold the label steady inside the box, 10–20 cm from the camera."
      footer={<>{!insecure && <Button onClick={retry} className="sm:mr-auto">Try again</Button>}<Button onClick={onClose}>Close</Button></>}
    >
      {error && <p role="alert" className="mb-3 rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">{error}</p>}
      {!insecure && (
        <div className="relative overflow-hidden rounded-card bg-ink">
          <video ref={videoRef} muted playsInline className="block aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-control border-2 border-white/80">
            <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 bg-brand shadow-[0_0_8px_rgba(181,18,27,0.9)]" />
          </div>
          {starting && <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white">Starting camera…</p>}
        </div>
      )}
    </Modal>
  )
}
