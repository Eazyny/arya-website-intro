# arya-website-intro

A Next.js + React Three Fiber intro experience featuring a CC4-exported 3D avatar (“Arya”) with a loader screen, welcome audio, and animation switching (Idle ↔ Talk).

This repo is built to be a clean, portfolio-ready example of:

- loading and presenting a 3D character on the web
- handling browser autoplay restrictions correctly (click-to-enter)
- managing animation states in Three.js/R3F
- building a polished “intro” flow for a personal brand site

---

## Features

- **3D Avatar (GLB) in the browser** using React Three Fiber + drei
- **Loader overlay** with animated GIF + progress % (via `useProgress`)
- **Click-to-enter gate** (unlocks audio autoplay reliably)
- **Welcome message audio** playback on enter
- **Idle/Talk animation switching**
- **Locked camera framing** (no orbit/zoom/pan)
- Basic **material stabilization tweaks** for transparency edge cases (hair/shoes)

---

## Tech Stack

- **Next.js** (App Router)
- **React Three Fiber** (`@react-three/fiber`)
- **drei** helpers (`@react-three/drei`)
- **three.js**
- TypeScript

---

## Getting Started (Local)

### 1) Install dependencies

npm install

### 2) Add required local assets

This repo intentionally excludes the full-resolution avatar model because GitHub has a 100MB file limit.

Place your files here:

Avatar model: public/models/arya.glb

Loader GIF: public/loader.gif

Welcome audio: public/welcomemessage.mp3

If you don’t have the model in place, the loader will hang because the 3D asset never finishes loading. That’s expected.

### 3) Run the dev server

npm run dev

Open:

http://localhost:3000

### Project Structure

src/  
 app/  
 page.tsx # Page entry  
 scene.tsx # Canvas, lighting, loader overlay, progress, audio gate  
 arya.tsx # GLB loading, animation control, material tweaks  
public/  
 loader.gif  
 welcomemessage.mp3  
 models/  
 arya.glb # (local only; ignored in git)

### How It Works

Loader + click-to-enter (autoplay-safe)  
Modern browsers block autoplay audio unless the user interacts.  
This project uses a loader overlay that becomes “Tap to Enter” only after the GLB finishes loading. The user click then triggers audio playback immediately.

Animation state  
IdleAnim plays by default

TalkAnim plays when isTalking is true

The intro audio playback can set isTalking = true and return to idle on audio.onended

Camera framing  
The camera is locked and aimed using camera.lookAt() so the user can’t move the view.

Notes on Large Files (GLB excluded)  
GitHub blocks files over 100MB, so the avatar model is intentionally excluded from this repo.

Recommended setup  
Keep the model local for development: public/models/arya.glb

For production, host the model externally (S3 / Cloudflare R2 / Vercel Blob / CDN) and load it by URL.

Common Issues  
Tap to Enter shows but Arya isn’t visible  
Make sure public/models/arya.glb exists locally and the path matches exactly.

Audio doesn’t play  
Audio playback depends on a user click (Tap to Enter). If you try to autoplay without interaction, browsers will block it.

My GLB is too big for GitHub  
Correct — GitHub blocks files over 100MB. This repo is set up to exclude large models via .gitignore.  
If you want to include large binaries in a repo, use Git LFS or host assets externally.

Roadmap (Next Up)  
Real lip sync using CC4 visemes (e.g. V_Lip_Open) tied to TTS audio

Dynamic TTS responses (ElevenLabs) instead of a single MP3

Speech-to-text input (mic) + assistant chat UI

Desktop build (Electron / Tauri) with the same 3D assistant

Author  
Built by BlockchainEazy (Eazy)

If you want to collaborate or use this intro flow in a project, feel free to reach out.

makefile  
Copy code  
::contentReference[oaicite:0]{index=0}
