# FAQ

### Is FounderVoice free?
Yes. The product is **100% free** for local use. No account is required to run on your machine.

### Does my audio leave my computer?
Recordings and Whisper stay local under `data/`. Optional cloud coaching (if you configure a key on *your* API) sends **text/metrics only**, never raw audio.

### Do I need a cloud AI key?
No. Built-in elite templates power coach summary, pitch estimates, language heuristics, and Practice Q&A without a key.

### What is Voice Memory?
Longitudinal patterns across sessions — recurring rushes, fillers, unclear technical words — used by Coach and Labs.

### Why are some scores labeled “estimate”?
Emotion, breath, investor, and presence metrics are acoustic/model estimates, not clinical or guaranteed fundraising scores.

### Can I host the web UI publicly?
You can host a marketing/welcome UI (e.g. Vercel). Keep the API + Whisper + `data/` on a machine you control for the privacy model.

### How do I wipe my data?
Coach → Fresh start (type `DELETE`), or delete the `data/` folder.

### Smart Session stops mid-talk?
Silence detection is browser-side. Adjust timing in Listen settings; leave longer pauses only when you want a new conversation clip.
