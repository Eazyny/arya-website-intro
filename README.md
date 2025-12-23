# arya-website-intro

A Next.js + React Three Fiber intro experience featuring a CC4-exported 3D avatar (“Arya”) with a loader screen, welcome audio, and animation switching (Idle ↔ Talk).

This repo is built to be a clean, portfolio-ready example of:

- loading and presenting a 3D character on the web
- handling browser autoplay restrictions correctly (click-to-enter)
- managing animation states in Three.js / R3F
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

## Required Local Assets (NOT included in this repo)

This repo intentionally **does not** include large/private binary assets (like your avatar model).  
If you clone this repo without adding these files, the app will either:

- keep showing the loader (model never finishes loading), or
- show a blank scene.

### You must provide these files:

1. **Avatar model**

- Put your model here: `public/models/your_model.glb`
- The code expects this exact path: `/models/your_model.glb`

2. **Loader GIF**

- Put your gif here: `public/loader.gif`
- The loader overlay displays this while the model is loading.

3. **Welcome audio**

- Put your intro audio here: `public/you_welcome_message.mp3`
- This plays after the user clicks “Tap to Enter” (autoplay-safe).

---

## Getting Started (Local)

### 1) Install dependencies

npm install

### 2) Add required assets

Create these paths and drop your files in:

public/
loader.gif
welcomemessage.mp3
models/
arya.glb

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
arya.glb # local-only file (ignored in git)

### How It Works

Loader + click-to-enter (autoplay-safe)

Modern browsers block autoplay audio unless the user interacts.

This project uses a loader overlay that becomes “Tap to Enter” only after the GLB finishes loading. The user click then triggers audio playback immediately.

### Animation states

IdleAnim plays by default

TalkAnim plays when isTalking is true

You can sync Talk/Idle to audio playback (e.g. switch to Talk while audio plays, back to Idle on audio.onended)

### Camera framing

The camera is locked and aimed using camera.lookAt() so the user can’t move the view.

## Roadmap

Real lip sync using CC4 visemes (e.g. V_Lip_Open) tied to TTS audio

Dynamic TTS responses (ElevenLabs) instead of a single MP3

Speech-to-text input (mic) + assistant chat UI

Desktop build (Electron / Tauri) with the same 3D assistant

### Author

Built by BlockchainEazy (Eazy)
