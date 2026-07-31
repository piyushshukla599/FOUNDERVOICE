# Changelog

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
