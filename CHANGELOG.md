# Changelog

## 1.2.2 — 2026-08-21

### Fixed
- **Search Console reported the app's own pages as crawl errors.** `robots.txt`
  disallowed `/record`, `/today`, `/library`, `/sessions/` and the rest, so URL
  Inspection answered "Crawl allowed? No: blocked by robots.txt" and refused to
  fetch them. Worse, it never achieved what it was for: Google cannot read a
  `noindex` on a page it is not allowed to fetch, so those URLs stayed eligible
  to be listed as bare links. They are now crawlable and turned away at the page
  with `X-Robots-Tag: noindex, nofollow`, which is what actually keeps them out.
  Public pages and the sitemap were never blocked and are unchanged.

## 1.2.1 — 2026-08-21

### Fixed
- **Recordings would not play back.** The Content-Security-Policy allowed the API
  origin in `connect-src` but not `media-src`, so Chrome blocked every `<audio>`
  source before it made a request. There was no network entry and no message —
  just a player that did nothing.
- Playback now serves the analysed 16k WAV rather than the browser's own WebM.
  MediaRecorder writes no duration and no cue index, so the element reported a
  duration of Infinity, the scrubber was dead, and every "listen to this moment"
  link in the report silently did nothing.
- The audio route is served `inline` instead of as an attachment, resolves the
  file by session id if the stored path has moved, and says so when nothing is left.
- **A visitor's workspace could be replaced by an empty one.** Any request that
  reached the API without the workspace cookie — an `<audio>` element or the PDF
  link, both of which drop a SameSite=Lax cookie when the site and the API are
  different sites — was answered with a fresh workspace *and* a `Set-Cookie`,
  taking the whole session list with it. Only the app's own fetches can mint one now.
- On a loopback install the client follows whichever host the page was opened on,
  so `localhost:3000` talks to `localhost:8000` and the cookie is first-party.
- Data recorded before per-visitor workspaces existed is moved into a workspace of
  its own on first start and handed to the first local visitor, instead of being
  orphaned in place.
- `public/icon.svg` shadowed the app-router icon route, returning 500 for every
  request; the stale file (old palette) is gone and `/icon.svg` serves the current mark.
- Windows asyncio no longer logs a traceback when a browser aborts a range request.

### Experience
- Session report player replaces the OS `<audio controls>` widget: gradient play
  button, scrubbable hairline, and the timeline above doubles as the scrubber with
  a live playhead.
- Professional voice report rebuilt without cards — 13 panels became scored rows,
  hairlines and whitespace.
- Waveform canvases, the PWA splash colour and the last stray palette tokens moved
  off the retired green/beige scheme.
- Listen stats and other tight grids no longer squeeze on narrow screens.

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
