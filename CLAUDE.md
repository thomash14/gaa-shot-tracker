# GAA Shot Tracker App

## What This Project Is
A web application for GAA (Gaelic Athletic Association) players and coaches to track and analyse shooting performance during practice sessions and matches. Players log shots from different positions on the pitch, and the app provides detailed analytics on conversion rates, accuracy by zone, and performance trends over time.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla - no frameworks)
- **Storage:** localStorage for local persistence, Supabase for cloud sync
- **Graphics:** SVG for pitch/shot map rendering
- **Auth:** Supabase Auth (email/password + Google OAuth)

## Project Structure
```
/
├── index.html          - Main entry point and full UI markup
├── styles.css          - All styling and responsive design
├── js/
│   ├── state.js        - Supabase init and all shared state variables
│   ├── utils.js        - Utility helpers (debounce, showLoading, etc.)
│   ├── storage.js      - localStorage read/write (loadData, saveData)
│   ├── auth.js         - Login, signup, Google OAuth, auth UI
│   ├── profile.js      - Profile menu, avatar, edit profile, change password
│   ├── sync.js         - Cloud sync with Supabase (save/delete shots + sessions)
│   ├── clubData.js     - GAA club names by county
│   ├── dashboard.js    - Home section, session carousel
│   ├── team.js         - Team management, invite codes, team drills
│   ├── sessions.js     - Session CRUD, display, view past sessions
│   ├── pitch.js        - SVG pitch interaction, shot recording, batch entry, undo
│   ├── analytics.js    - Zone system, stats, filtering, shot maps with mirroring
│   ├── drills.js       - Practice drill system, scoring zones, custom drills
│   ├── ui.js           - Navigation (switchSection, switchTab, updateUI)
│   └── app.js          - Bootstrap: wraps saveData with cloud sync + initAuth()
└── CLAUDE.md           - This file
```

## Key Data Structures

### Shot Object
```json
{
  "x": 45.2,
  "y": 30.1,
  "distance": 22.5,
  "foot": "left|right",
  "half": "1st|2nd|null",
  "shotFor": "point|goal",
  "shotCategory": "in-play|free-kick|45",
  "shotType": "standing|running|etc.",
  "pointValue": 1,
  "result": "scored|missed",
  "timestamp": "2025-01-15T10:30:00Z",
  "comment": "",
  "batch": false,
  "cloudId": "uuid-from-supabase"
}
```

### Session Object
```json
{
  "id": 1705312200000,
  "name": "Session Name",
  "date": "2025-01-15",
  "type": "practice|match",
  "matchType": "league|championship|friendly|custom|null",
  "shots": [],
  "startTime": "2025-01-15T10:30:00Z",
  "cloudId": "uuid-from-supabase"
}
```

## Key Features
- Shot tracking with tap-to-place on SVG pitch map
- Single shot and batch entry modes
- 9-zone analysis system for conversion rates
- Session history with carousel navigation
- Dynamic practice drills with customisable scoring zones
- Club/team management with coach-player relationships
- GAA-specific stats: goals, points, foot-specific conversion rates
- Match mode with 1st/2nd half tracking
- Cloud sync via Supabase with offline fallback

## Important Conventions
- All dates should be handled in local timezone (there were timezone bugs before — be careful with UTC vs local)
- Shot coordinates are stored as percentages (0-100) relative to the full SVG dimensions (viewBox 0 0 500 725)
- The pitch boundary within the SVG is NOT centred: x=25..425, y=40..684. This means the pitch spans 5%-85% in X and 5.5%-94.3% in Y. Mirroring must account for this asymmetry (mirror around pitch centre, not SVG centre)
- localStorage keys follow the pattern: `gaa_tracker_[entity]_[id]`
- Use Irish English spelling (analyse, colour, customise, etc.)
- `cloudId` on shots/sessions tracks whether they've been synced to Supabase
- `app.js` wraps `saveData()` to trigger async cloud sync via `cloudSavePromise`

## Known Issues / Things To Watch Out For
- Timezone handling in session date filtering has caused bugs before — always test with local dates
- Large numbers of shots in a single session can slow down SVG rendering
- The legacy `renderShotMap()` function in analytics.js (SVG-based) is unused — `renderShotMapWithFilters()` (DIV-based) is the active shot map renderer

## Common Tasks
When asked to work on this project, here are typical things I might ask for:
- Adding new analytics views or stats
- Fixing bugs in shot mapping or session filtering
- Improving the UI/UX of existing features
- Refactoring large files into smaller modules
- Adding new drill types or scoring configurations
