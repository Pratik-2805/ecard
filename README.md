# E-Card Magic – Multi-Event Interactive E-Card Creator

An interactive, emotionally personalized E-Card experience engine with backend storage, instant link & QR generation, inspired by [lovehearts-2p4.pages.dev](https://lovehearts-2p4.pages.dev/).

---

## 🌟 Interactive Features (100% Optional & Event-Adapted)

All features are optional — if left empty, the e-card flows seamlessly without any interruptions. When used, every category automatically adapts its questions, vibes, coupons, and witnesses to match the relationship!

### 1. 🎙️ Voice Message from Your Heart
- **In-Browser Recording**: Click **🎙️ Record Voice Note** with a live seconds counter and audio waveform. Stop, preview, or re-record with one click.
- **Upload Voice Memo**: Or upload an audio file from your device.
- **Retro Cassette Player**: Appears on the final page as an animated vintage cassette tape. When the recipient taps play, background music automatically pauses so your voice is crystal clear.

### 2. 🔐 Inside-Joke Secret Love Lock
- **Personalized Passcode Question**: Lock the envelope behind an inside joke only the two of you know!
  - *I Miss You*: "Where are we traveling together the moment we meet?"
  - *Boyfriend's Day*: "Where was our very first date?"
  - *Girlfriend's Day*: "What is my absolute favorite thing about you?"
  - *Best Friend*: "What's our most unhinged shared secret?"
- **Interactive Unlock**: The recipient answers the question to blast confetti and pop open the envelope!

### 3. 🎟️ Interactive Scratch-Off Promises & Love Vouchers
- **Canvas Scratch Foil**: 3 metallic scratch cards that the recipient rubs with their finger or mouse to peel away the foil in real-time.
- **Category-Adapted Vouchers**:
  - *I Miss You*: 10-Minute Reunion Hug, Sleep on FaceTime Pass, Favorite Meal.
  - *Boyfriend's Day*: Head Massage & Cuddles, You Pick the Movie, Get Out of Argument Pass.
  - *Girlfriend's Day*: Princess Treatment Day, Late Night Boba Run, Blanket Burrito Hug.
  - *Best Friend*: Food on My Tab, 2 AM Vent Session, Emergency Date Escape Call.

### 4. 🎭 Relationship Vibe Selector
- **💖 Romantic & Soft**: Poetic atmosphere, warm rose gradients, soft hearts.
- **🤣 Playful & Roasty**: Humorous banter, fun memes, chaotic energy.
- **🥺 Nostalgic & Deep**: Film grain accents, twilight lavender, emotional depth.

### 5. 🐾 Official Certificate Witness Picker
- Choose who officially co-signs as witness:
  - 🐱 **The Cat**
  - 🐶 **Good Doggo**
  - 🌙 **The Moon** (*for Long Distance*)
  - 👼 **Cupid** (*for Valentine's*)
  - ✨ **Custom Witness Name & Pet Photo Upload** (renders an avatar badge on the Certificate!)

---

## 💖 Supported Event Categories

1. **👦 Boyfriend's Day**
2. **👧 Girlfriend's Day**
3. **👯‍♀️ Best Friend / Friendship Day**
4. **💖 Valentine's Day**
5. **✈️ I Miss You / Long Distance**
6. **💍 Anniversary**
7. **🎂 Birthday**
8. **✨ Custom Event**

---

## 🚀 Running the App

```bash
# Start backend server
node server.js

# Or in development mode:
npm run dev
```

- **Creator App**: [http://localhost:3000](http://localhost:3000)
- **Live "I Miss You" Demo (with Secret Lock & Scratch Cards)**: [http://localhost:3000/?id=0e4c1e4c-c2c8-48db-a85e-3b728c776927](http://localhost:3000/?id=0e4c1e4c-c2c8-48db-a85e-3b728c776927)
  *(Secret Answer: `Airport`)*
