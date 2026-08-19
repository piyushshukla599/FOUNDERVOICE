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

### How do I use Labs?
Open **Labs**. Each drill shows a **sentence to speak**, **how to say it**, and **what that means**. Record that line. The report grades only that skill, then suggests more labs like it.

### When do I get a final Listen verdict?
After a Smart Session, complete a Labs drill (exercise/test). Real conversations are collected first; the Founder Voice Score unlocks after the drill. Earbuds or a headset help.

### Why is the web on port 3002?
Port 3000 was already in use. Use the URL Next prints. Restart the API if the page loads but data does not (CORS).
