import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  X,
  CheckCircle2,
  Sparkles,
  Music,
  Film,
} from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import { useToast } from '../context/ToastContext'
import { formatBytes } from '../utils/format'
import { cn } from '../utils/cn'

const ACCEPTED = ['audio/', 'video/']
const MAX_SIZE = 500 * 1024 * 1024 // 500MB

export default function Upload() {
  const toast = useToast()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)

  const isVideo = file?.type.startsWith('video/')

  const simulateUpload = useCallback(() => {
    setProgress(0)
    setUploaded(false)
    let p = 0
    const id = setInterval(() => {
      p += Math.random() * 18 + 6
      if (p >= 100) {
        p = 100
        clearInterval(id)
        setUploaded(true)
      }
      setProgress(Math.round(p))
    }, 220)
  }, [])

  const handleFile = useCallback(
    (f) => {
      if (!f) return
      const valid = ACCEPTED.some((t) => f.type.startsWith(t))
      if (!valid) {
        toast.error('Unsupported file', 'Please upload an audio or video file.')
        return
      }
      if (f.size > MAX_SIZE) {
        toast.error('File too large', 'Maximum file size is 500MB.')
        return
      }
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
      simulateUpload()
    },
    [simulateUpload, toast],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    setUploaded(false)
  }

  const analyze = () => {
    navigate('/processing', { state: { fileName: file?.name } })
  }

  return (
    <PageTransition>
      <PageHeader
        title="Upload Interview"
        subtitle="Upload an audio or video recording to start the AI analysis."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Dropzone */}
          {!file && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all focus-ring',
                dragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-line bg-surface hover:border-primary/50 hover:bg-surface-3/50',
              )}
            >
              <motion.div
                animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
              >
                <UploadCloud className="h-8 w-8" />
              </motion.div>
              <p className="mt-5 text-lg font-semibold text-ink">
                {dragging ? 'Drop your file here' : 'Drag & drop your interview file'}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                or <span className="font-semibold text-primary">browse</span> to choose a file
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-subtle">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5">
                  <Music className="h-3.5 w-3.5" /> MP3, WAV, M4A
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5">
                  <Film className="h-3.5 w-3.5" /> MP4, MOV, WEBM
                </span>
                <span className="rounded-full bg-surface-3 px-3 py-1.5">Up to 500MB</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {/* File preview + progress */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <Card>
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
                        isVideo ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent',
                      )}
                    >
                      {isVideo ? <FileVideo className="h-6 w-6" /> : <FileAudio className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-semibold text-ink">{file.name}</p>
                        <button
                          onClick={reset}
                          className="shrink-0 rounded-lg p-1.5 text-ink-subtle hover:bg-surface-3 hover:text-danger"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {formatBytes(file.size)} · {file.type || 'media file'}
                      </p>

                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink-muted">
                            {uploaded ? 'Upload complete' : 'Uploading…'}
                          </span>
                          <span className="font-semibold text-ink">{progress}%</span>
                        </div>
                        <ProgressBar value={progress} />
                      </div>
                    </div>
                  </div>

                  {/* Media preview */}
                  {previewUrl && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface-2">
                      {isVideo ? (
                        <video src={previewUrl} controls className="max-h-72 w-full bg-black" />
                      ) : (
                        <div className="flex items-center gap-3 p-4">
                          <FileAudio className="h-5 w-5 text-accent" />
                          <audio src={previewUrl} controls className="w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={reset}>
                      Choose different file
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={analyze}
                      disabled={!uploaded}
                      loading={!uploaded}
                    >
                      {uploaded ? (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Analyze Interview
                        </>
                      ) : (
                        'Preparing…'
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar tips */}
        <div className="space-y-5">
          <Card>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-primary" /> What we analyze
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                'Full speech-to-text transcript',
                'Sentiment across the conversation',
                'Confidence & delivery scoring',
                'Communication metrics',
                'AI summary report (PDF)',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-brand-gradient text-white">
            <h3 className="text-sm font-semibold">💡 Pro tip</h3>
            <p className="mt-2 text-sm text-white/85">
              For best results, upload clear recordings with minimal background noise. Higher audio
              quality improves transcription accuracy.
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
