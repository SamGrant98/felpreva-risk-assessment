# Felpreva CatCheck — Parasite Risk Assessment

**Live:** [catcheckparasiterisk.com](https://www.catcheckparasiterisk.com/)
**Client:** Felpreva
**Experience design:** WHM&I
**Build & maintenance:** Seymourpowell
**Repo:** [github.com/SeymourpowellLtd/felpreva-risk-assessment](https://github.com/SeymourpowellLtd/felpreva-risk-assessment)

---

## Overview

CatCheck is a **mobile-only WebAR experience** that helps cat owners assess their cat's parasite risk. Users place a 3D cat model in their environment using augmented reality, customise it to match their own cat, answer 13 questions about their cat's lifestyle, and receive a personalised risk report (Lower / Moderate / Higher risk).

The experience is available in **10 languages** and submits anonymised session data to the [Felpreva Dashboard](https://github.com/SeymourpowellLtd/felpreva-dashboard) for analytics.

> **Mobile only.** The AR experience requires a smartphone camera and will not function correctly on desktop browsers.

---

## Migration Context

This project was originally built on and hosted through **8th Wall's managed WebAR platform**. 8th Wall has since open-sourced their engine, and this repo contains that open-source export. The current goal is to **relaunch an editable, self-hosted version on DigitalOcean** that matches the currently live experience at catcheckparasiterisk.com.

The existing live site is no longer editable via 8th Wall. All future changes must go through this codebase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AR Engine | 8th Wall (open-source export) |
| 3D Scene | A-Frame 1.3.0 + Three.js |
| 3D Models | glTF/GLB (cat model + props) |
| Build | Webpack 5 + Babel |
| Language | JavaScript (ES6+) + TypeScript 5 |
| Styling | CSS3 + SASS |
| Audio | Atmoky WebSDK (spatial audio) |
| Localisation | JSON translation files (10 languages) |
| Screenshot | html2canvas + Web Share API |
| Geolocation | Nominatim (OpenStreetMap reverse geocoding) |
| Analytics | Google Consent Mode + custom session tracking |

---

## User Flow

```
Cookie / analytics consent
        ↓
Sound preference
        ↓
Tap to place cat in AR environment
        ↓
Customise cat (texture, name, age, weight, pregnancy)
        ↓
13-question lifestyle questionnaire
        ↓
Risk report (Lower / Moderate / Higher)
        ↓
Share / screenshot
```

Questions trigger contextual 3D props, particle effects, and cat animations based on answers. On completion, the session is submitted to the dashboard backend.

---

## Languages

English, French, Italian, Spanish, German, Portuguese, Polish, Dutch, Czech, Slovak.

Translation strings live in `src/translations/`. SVG graphics with localised text have per-language variants in `src/assets/UI/Felpreva/`.

> **Note:** Parasite particle effects are intentionally disabled for French (`fr`) by client request.

---

## Project Structure

```
src/
├── app.js                   # Entry point; registers all A-Frame components
├── index.html / body.html   # HTML template
├── Scripts/
│   ├── startscreen.js       # Launch screen + XR8 init
│   ├── tap-place.js         # AR placement (raycasting, cursor ring)
│   ├── customisation.js     # Cat texture, name, age, weight, pregnancy
│   ├── questionnair.js      # 13-question quiz logic + "Did You Know" facts
│   ├── report.js            # Risk calculation, theming, screenshot/share
│   ├── storage.js           # Session tracking, localStorage, API submission
│   ├── audio.js             # Sound effects (meows, purrs, chirps)
│   ├── next-anim.js         # Cat animations + blend shape morphing
│   ├── prop-spawner.js      # Dynamic prop spawning based on answers
│   ├── language-picker.js   # i18n switching + SVG localisation
│   └── permission-screen.js # Cookie consent + Google Consent Mode
├── assets/
│   ├── models/              # cat_v6.glb + interactive props
│   ├── textures/Cat/        # 10 cat colour/pattern texture variants
│   ├── audio/               # Sound effects
│   └── UI/Felpreva/         # SVGs, icons, localised graphics
├── translations/            # JSON i18n files (one per language)
└── myxrextras/              # 8th Wall utilities + XR A-Frame components
external/
└── xr/                      # 8th Wall open-source engine scripts
config/
└── webpack.config.js
```

---

## Local Development

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Setup

```bash
npm install
npm run serve
```

### Testing on Mobile

AR requires camera access over HTTPS. Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 8080
```

Then add the following to the `devServer` section in `config/webpack.config.js`:

```javascript
devServer: {
  // ... existing config
  allowedHosts: ['.ngrok-free.dev']
}
```

Access the ngrok HTTPS URL on your phone.

### Production Build

```bash
npm run build
```

Output is written to `dist/`. Deploy the contents of `dist/` as a static site (DigitalOcean App Platform, static site, or equivalent).

---

## Environment / Configuration

The frontend requires `window.API_BASE_URL` to be set at runtime, pointing to the dashboard backend. Inject this in the HTML before the app loads:

```html
<script>window.API_BASE_URL = "https://felpreva-dashboard-mjnb8.ondigitalocean.app";</script>
```

This is currently hardcoded in `src/Scripts/storage.js` — update or externalise this when deploying to a new environment.

---

## Backend Integration

On quiz completion the app POSTs a session payload to:

```
POST {API_BASE_URL}/felpreva-dashboard-backend/api/entries
```

This endpoint is provided by the **felpreva-dashboard** backend. See that repo for the full API contract, database schema, and environment setup.

Submitted data includes: cat demographics, all question answers, risk level, per-step timing, geolocation, and session identifiers.

---

## Related

- **Dashboard repo:** [github.com/SeymourpowellLtd/felpreva-dashboard](https://github.com/SeymourpowellLtd/felpreva-dashboard)
- **Live dashboard:** [felpreva-dashboard-mjnb8.ondigitalocean.app](https://felpreva-dashboard-mjnb8.ondigitalocean.app/)
