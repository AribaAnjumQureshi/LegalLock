'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Fingerprint } from 'lucide-react'
import { Seal } from '@/components/seal'
import { Button } from '@/components/ui/button'
import { setSession } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [officialId, setOfficialId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [faceImage, setFaceImage] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), [])

  async function openCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      setCameraOpen(true)
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream })
    } catch { setError('Camera permission is required for face verification.') }
  }

  function captureFace() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return setError('Camera is not ready. Please try again.')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setFaceImage(canvas.toDataURL('image/jpeg', 0.82))
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const body = mode === 'login'
        ? { username, email, password, faceImage }
        : { username, email, password, fullName, officialId, faceImage }
      const response = await fetch(`${API_BASE}/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed')
      setSession(data.token, data.user)
      router.replace('/dashboard')
    } catch (e: any) { setError(e.message) } finally { setSubmitting(false) }
  }

  return <main className="flex min-h-screen flex-col bg-background">
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Seal className="size-14 text-primary" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">LegalLock</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Secure Document Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">LegalLock · Secure Portal</p>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-2"><Lock className="size-4 text-primary"/><h2 className="text-sm font-semibold">{mode === 'login' ? 'Personnel Sign In' : 'Create Account'}</h2></div>
            <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} className="text-xs font-medium text-primary hover:underline">{mode==='login'?'Create account':'Back to sign in'}</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
            {mode === 'register' && <div><label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label><input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 h-10 w-full rounded-sm border px-3 text-sm"/></div>}
            <div><label className="text-xs font-semibold uppercase text-muted-foreground">Username</label><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="your.username" className="mt-1 h-10 w-full rounded-sm border px-3 text-sm"/></div>
            <div><label className="text-xs font-semibold uppercase text-muted-foreground">Official Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="mt-1 h-10 w-full rounded-sm border px-3 text-sm"/></div>
            {mode === 'register' && <div><label className="text-xs font-semibold uppercase text-muted-foreground">Government / Official ID</label><input required value={officialId} onChange={e=>setOfficialId(e.target.value.toUpperCase())} placeholder="Official ID" className="mt-1 h-10 w-full rounded-sm border px-3 text-sm"/></div>}
            <div><label className="text-xs font-semibold uppercase text-muted-foreground">Password</label><input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 h-10 w-full rounded-sm border px-3 text-sm"/></div>
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Face Verification</p><p className="text-xs text-muted-foreground">{faceImage ? 'Face captured. Ready for verification.' : 'Capture one clear face image before continuing.'}</p></div><button type="button" onClick={openCamera} className="rounded-sm border px-3 py-2 text-xs font-semibold hover:bg-muted">{faceImage ? 'Recapture' : 'Open Camera'}</button></div>
              {cameraOpen && <div className="mt-3 flex flex-col gap-2"><video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full rounded-sm bg-black object-cover"/><button type="button" onClick={captureFace} className="h-9 rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground">Capture Face</button></div>}
            </div>
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <Button type="submit" disabled={submitting} className="h-10 w-full gap-2 rounded-sm"><Fingerprint className="size-4"/>{submitting ? 'Please wait…' : mode==='login' ? 'Secure Sign In' : 'Create Account'}</Button>
          </form>
        </div>
      </div>
    </div>
  </main>
}
