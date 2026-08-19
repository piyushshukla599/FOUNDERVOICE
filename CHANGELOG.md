# Changelog

## 1.2.0 — 2026-08-19

### Experience (no feature or content changes)
- Guided first run at `/onboarding`; `/welcome` now redirects there so there is one way in
- **Today** rebuilt around three layers: what to work on, one action, light progress
- Immersive recording surface — timer, live waveform, and coaching cues replace the page while you speak
- Session report leads with one insight, then a scrubbable timeline of the moments worth rehearing
- Sessions / Progress / Coach / Practice / Listen restated as type and whitespace instead of stacked cards
- Preference system (goal, coaching style, intensity, session length, focus, name) shapes what each page shows first
- Score is now the hero: an animated gradient ring that draws and counts up on Today and Progress
- Pressing record runs a 3-2-1 countdown, then live pace against a 130–140 target while you speak
- Ambient light behind hero content on every main screen, so the centre of the page has depth at rest
- Headline scaled back and the reclaimed space given to a waveform and live pace readout
- Labs levels are a training path with a rail and glowing node, not a filter row
- Record, Listen and the session report no longer stack panels — zero card wrappers left between them
- Sidebar: gradient wordmark, glow-and-ring active state, hover slide; rail now appears at lg so tablets get the bottom bar, with safe-area insets on mobile
- Design language: charcoal base lit by violet / indigo / magenta atmosphere with grain, gold kept for streaks and premium moments, borders as the exception

### Fixed
- API froze for the length of every analysis — the pipeline ran on the event loop, so polling, uploads and health checks queued behind it. Analyses now run on a dedicated worker thread, one at a time
- `OMP: Error #15` process aborts on Windows when librosa and ctranslate2 both loaded an OpenMP runtime
- Production build failed on pre-existing type errors (`CoachSummary`, `mic.ts`, duplicate `SpeechRecognition` declarations) and a conditional hook in the session report
- Fonts were fetched from Google at build time, so every heading fell back to Times New Roman offline or behind a proxy; typefaces now resolve from the OS
- Windows asyncio logged a ConnectionResetError traceback every time a browser seeked or paused audio playback; that client-disconnect noise is filtered out
- `NEXT_DIST_DIR` lets a production build run without fighting a live `next dev` over .next

## 1.1.0 — 2026-08-19

### Product
- **Today** home (`/`): 60s check, score, Voice Memory lab hints
- **Labs**: Speak this / How to speak it / What this means; similar labs after a drill; levels as a map (not a lock)
- **Listen**: collect real talk; Founder Voice Verdict after a Labs exercise (earbuds/mic notes)
- Session / Record / Practice / Listen: plain-language “your voice sounds like…” + recommended lab
- CORS: localhost on 3001/3002 so Next.js can fetch the API

### Docs
- Features & workflows, web app, API, setup updated to current routes and Labs/Listen flow

## 1.0.0 — 2026-07-31

### Product
- Local-first FounderVoice AI coach: Record, Smart Session, Library, Dashboard, Coach, Labs, Practice
- Full analysis pipeline (Whisper + acoustics + professional report + Voice Memory)
- Built-in elite coach templates when optional cloud coach key is unset
- Custom filler lexicon (Coach UI)
- Contact / feedback form (local save + optional SMTP)

### Launch polish
- Welcome, Privacy, Terms pages
- Security headers, request logging, upload/contact rate limits
- Docker Compose for API + data volume
- SEO: metadata, Open Graph, robots, sitemap, web manifest
- Error boundary, empty/loading states, accessibility skips

### Privacy
- Audio and Whisper remain on-device / in local `data/`
- No cloud audio storage in the product design
