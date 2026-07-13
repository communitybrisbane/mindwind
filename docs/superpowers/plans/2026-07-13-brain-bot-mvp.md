# Brain Bot MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal AI advisor app that helps new graduates recognize their own decision-making patterns and provide self-mentoring through recorded daily reflections.

**Architecture:** Next.js full-stack with Firebase Firestore backend. Claude API handles AI classification and pattern analysis. Vector embeddings stored in Firestore enable semantic search. Three-stage recording flow: input -> auto-classification -> deep-dive question -> save. Search queries trigger pattern analysis across user's historical records.

**Tech Stack:** Next.js 14 + TypeScript, Firebase Firestore, Claude API (text + embeddings), Web Speech API, Tailwind CSS, Docker Compose, Vercel deployment

**Design System:** Starbucks-inspired UI (see `docs/DESIGN-brain-bot.md`). Starbucks Green brand color, warm cream canvas, Inter/Manrope fonts, pill buttons, 12px card radius, layered shadows, responsive 5-breakpoint system.

---

## File Structure

### Project Root
```
brain_bot/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── layout.tsx                # Root layout with nav + providers
│   │   ├── page.tsx                  # Dashboard / home page
│   │   ├── record/page.tsx           # Recording page
│   │   ├── search/page.tsx           # Search & consultation page
│   │   └── api/
│   │       ├── auth/                 # Auth endpoints (future)
│   │       ├── record/
│   │       │   ├── classify/route.ts # Auto-classification endpoint
│   │       │   ├── deepdive/route.ts # Deep-dive question endpoint
│   │       │   └── save/route.ts     # Save thought record
│   │       ├── search/
│   │       │   ├── vector/route.ts   # Vector search endpoint
│   │       │   └── analyze/route.ts  # Pattern analysis endpoint
│   │       └── thoughts/
│   │           ├── route.ts          # GET thoughts list
│   │           └── [id]/route.ts     # GET/UPDATE/DELETE thought
│   │
│   ├── components/
│   │   ├── Recording/
│   │   │   ├── InputForm.tsx         # Audio/text input component
│   │   │   ├── ClassificationView.tsx # Shows auto-classification results
│   │   │   └── DeepDiveQuestion.tsx  # Shows and captures deep-dive answer
│   │   ├── Search/
│   │   │   ├── QueryForm.tsx         # Search query input
│   │   │   └── AdviceDisplay.tsx     # Shows pattern analysis & advice
│   │   ├── Common/
│   │   │   ├── Button.tsx            # 4 variants: primary, outline, outline-dark, dark-text
│   │   │   ├── Card.tsx              # 3 variants: default, warm, dark (feature-band)
│   │   │   ├── Alert.tsx             # Success/error alerts with auto-dismiss
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── Navigation/
│   │   │   └── GlobalNav.tsx         # Fixed top nav + mobile hamburger
│   │   └── Dashboard/
│   │       ├── StreakDisplay.tsx     # Shows consecutive days
│   │       ├── CalendarView.tsx      # Calendar with recorded days
│   │       └── RecentThoughts.tsx    # Last 3-5 thoughts preview
│   │
│   ├── lib/
│   │   ├── firebase.ts               # Firebase initialization & client
│   │   ├── firestore.ts              # Firestore queries (thoughts, users)
│   │   ├── claude.ts                 # Claude API wrapper
│   │   ├── embeddings.ts             # Claude embeddings wrapper
│   │   ├── vector-search.ts          # Vector similarity search logic
│   │   ├── types.ts                  # TypeScript types/interfaces
│   │   └── utils.ts                  # Helper functions (date, format, etc)
│   │
│   └── styles/
│       └── globals.css               # Design tokens + Tailwind + global styles
│
├── __tests__/
│   ├── unit/
│   │   ├── firebase.test.ts
│   │   ├── claude.test.ts
│   │   ├── vector-search.test.ts
│   │   └── types.test.ts
│   ├── integration/
│   │   ├── recording-flow.test.ts
│   │   ├── search-flow.test.ts
│   │   └── firestore-queries.test.ts
│   └── e2e/
│       ├── recording.spec.ts
│       ├── search.spec.ts
│       └── dashboard.spec.ts
│
├── docs/
│   ├── ARCHITECTURE.md               # (existing)
│   ├── DEVELOPMENT.md                # (existing)
│   ├── DESIGN-brain-bot.md           # (existing) UI/UX design spec
│   ├── mentor-reference.md           # (existing)
│   └── superpowers/
│       └── plans/
│           └── 2026-07-13-brain-bot-mvp.md  # this file
│
├── docker-compose.yml                # Docker setup with Firebase emulator
├── Dockerfile
├── .env.example
├── .env.local                        # Local dev config
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts                # Starbucks design system tokens
├── postcss.config.js
├── package.json
└── README.md                         # (existing)
```

---

## Tasks

### Task 1: Project Setup, Environment & Design System Foundation

**Files:**
- Create: `package.json` (with dependencies)
- Create: `.env.example`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.gitignore`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/styles/globals.css`

> **IMPORTANT:** Tailwind config and design tokens MUST be created here, BEFORE any component code. All subsequent components use these tokens.

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "brain-bot",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "firebase": "^10.5.0",
    "@anthropic-ai/sdk": "^0.10.0",
    "tailwindcss": "^3.3.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "firebase-admin": "^12.0.0",
    "@tailwindcss/forms": "^0.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

- [ ] **Step 2: Create .env.example**

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Claude API
CLAUDE_API_KEY=your_claude_api_key

# Environment
NODE_ENV=development
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  firebase-emulator:
    image: google/firebase-emulators-suite:latest
    ports:
      - "9099:9099"  # Firebase Auth
      - "8080:8080"  # Firestore
      - "8085:8085"  # Realtime Database
      - "9199:9199"  # Storage
    environment:
      - FIREBASE_DATABASE_EMULATOR_HOST=localhost:8080
      - FIRESTORE_EMULATOR_HOST=localhost:8080
    command: firebase emulators:start --project=test --only firestore,auth

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=test
      - FIRESTORE_EMULATOR_HOST=firebase-emulator:8080
      - FIREBASE_AUTH_EMULATOR_HOST=firebase-emulator:9099
    depends_on:
      - firebase-emulator
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

- [ ] **Step 6: Create Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

- [ ] **Step 7: Create tailwind.config.ts (Starbucks Design System)**

> **Reference:** `docs/DESIGN-brain-bot.md` Section 2 (Colors), Section 3 (Typography), Section 4 (Spacing), Section 5 (Components)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#006241',   // Starbucks Green - H1 headings, brand signal
          accent: '#00754A',    // Green Accent - CTAs, filled buttons
          dark: '#1E3932',      // House Green - feature bands, footer
          light: '#d4e9e2',     // Green Light - valid states, light bg
        },
        surface: {
          warm: '#f2f0eb',      // Neutral Warm - page canvas
          ceramic: '#edebe9',   // Ceramic - section separators
          cool: '#f9f9f9',      // Neutral Cool - dropdown, utility
        },
        semantic: {
          error: '#c82014',     // Error, destructive states
          warning: '#fbbc05',   // Warning states
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"Iowan Old Style"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display': ['2.8rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h1': ['24px', { lineHeight: '36px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2': ['24px', { lineHeight: '36px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'body-lg': ['19px', { lineHeight: '33.25px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'small': ['14px', { lineHeight: '21px', letterSpacing: '-0.01em' }],
        'micro': ['13px', { lineHeight: '19.5px', letterSpacing: '-0.01em' }],
      },
      letterSpacing: {
        tight: '-0.01em',
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '16px',
        'space-4': '24px',
        'space-5': '32px',
        'space-6': '40px',
        'space-7': '48px',
        'space-9': '64px',
      },
      borderRadius: {
        'pill': '50px',
        'card': '12px',
        'input': '4px',
      },
      boxShadow: {
        'card': '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
        'card-hover': '0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.16)',
        'nav': '0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)',
        'elevated': '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)',
      },
      height: {
        'nav-xs': '64px',
        'nav-mobile': '72px',
        'nav-tablet': '83px',
        'nav-desktop': '99px',
      },
      padding: {
        'gutter-xs': '16px',
        'gutter-md': '24px',
        'gutter-lg': '40px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config
```

- [ ] **Step 8: Create postcss.config.js**

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 9: Create src/styles/globals.css (Design Tokens + Global Styles)**

> **Reference:** `docs/DESIGN-brain-bot.md` Section 10 (Design Tokens Summary)

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

/* ===== Design Tokens (from DESIGN-brain-bot.md) ===== */
:root {
  /* Colors */
  --color-primary: #006241;
  --color-accent: #00754A;
  --color-dark: #1E3932;
  --color-light: #d4e9e2;
  --color-neutral-warm: #f2f0eb;
  --color-ceramic: #edebe9;
  --color-neutral-cool: #f9f9f9;
  --color-white: #ffffff;
  --color-text-primary: rgba(0, 0, 0, 0.87);
  --color-text-secondary: rgba(0, 0, 0, 0.58);
  --color-text-placeholder: rgba(0, 0, 0, 0.38);
  --color-text-on-dark: rgba(255, 255, 255, 1);
  --color-text-on-dark-secondary: rgba(255, 255, 255, 0.70);
  --color-error: #c82014;
  --color-warning: #fbbc05;

  /* Typography */
  --font-family: 'Inter', 'Manrope', 'Helvetica Neue', sans-serif;
  --font-family-serif: 'Iowan Old Style', Georgia, serif;
  --letter-spacing: -0.01em;

  /* Spacing (rem-based, 1rem = 10px in design) */
  --space-1: 0.4rem;
  --space-2: 0.8rem;
  --space-3: 1.6rem;
  --space-4: 2.4rem;
  --space-5: 3.2rem;
  --space-6: 4rem;
  --space-7: 4.8rem;
  --space-9: 6.4rem;

  /* Gutter tokens */
  --outerGutter: 1.6rem;
  --outerGutterMedium: 2.4rem;
  --outerGutterLarge: 4.0rem;

  /* Shadows */
  --shadow-card: 0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24);
  --shadow-card-hover: 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.16);
  --shadow-nav: 0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07);
  --shadow-elevated: 0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14);

  /* Radius */
  --radius-card: 12px;
  --radius-button: 50px;
  --radius-input: 4px;

  /* Input border */
  --color-input-border: #d6dbde;
}

/* ===== Base Styles ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: var(--letter-spacing);
  color: var(--color-text-primary);
  background-color: var(--color-neutral-warm);
}

/* ===== Utility classes for design system ===== */
@layer components {
  .btn-active {
    @apply transition-all duration-200 ease-in-out;
  }
  .btn-active:active {
    transform: scale(0.95);
  }

  .input-focus {
    @apply transition-all duration-200 ease-in-out;
  }
  .input-focus:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(0, 117, 74, 0.1);
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add package.json .env.example tsconfig.json next.config.ts docker-compose.yml Dockerfile .gitignore tailwind.config.ts postcss.config.js src/styles/globals.css
git commit -m "feat: project setup with Starbucks design system tokens and Tailwind config"
```

---

### Task 2: Type Definitions & Data Model

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write failing test for types**

```typescript
// __tests__/unit/types.test.ts
import { Thought, User, ClassificationResult, DeepDiveQuestion, PatternAnalysis } from '@/lib/types';

describe('Types', () => {
  it('should define Thought with all required fields', () => {
    const thought: Thought = {
      id: 'test-1',
      userId: 'user-1',
      date: new Date(),
      rawInput: 'test input',
      event: 'test event',
      thinking: 'test thinking',
      decision: 'test decision',
      reason: 'test reason',
      emotion: 'test emotion',
      values: 'test values',
      embedding: [0.1, 0.2, 0.3],
      deepDiveQuestion: 'test question',
      deepDiveAnswer: 'test answer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(thought.id).toBe('test-1');
  });

  it('should define ClassificationResult with all fields', () => {
    const result: ClassificationResult = {
      event: 'happened',
      thinking: 'thought',
      decision: 'decided',
      reason: 'because',
      emotion: 'happy',
      values: 'growth',
    };
    expect(result.event).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test (will fail)**

```bash
npm test -- __tests__/unit/types.test.ts
# Expected: FAIL - types.ts not found
```

- [ ] **Step 3: Create src/lib/types.ts**

```typescript
// Core data model for thoughts/reflections
export interface Thought {
  id: string;
  userId: string;
  date: Date;
  rawInput: string;
  event: string;
  thinking: string;
  decision: string;
  reason: string;
  emotion: string;
  values: string;
  embedding: number[];
  deepDiveQuestion: string;
  deepDiveAnswer?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassificationResult {
  event: string;
  thinking: string;
  decision: string;
  reason: string;
  emotion: string;
  values: string;
}

export interface DeepDiveQuestion {
  question: string;
  priority: 'clarify_abstract' | 'explore_psychology' | 'resolve_contradiction';
}

export interface PatternAnalysis {
  behaviorPatterns: string;
  psychologyPatterns: string;
  valuePatterns: string;
  successFailurePatterns: string;
  advice: string;
}

export interface User {
  id: string;
  email?: string;
  createdAt: Date;
  lastRecordedAt?: Date;
  streakDays: number;
}

export interface RecordingRequest {
  rawInput: string;
  inputType: 'text' | 'audio';
}

export interface ClassifyRequest {
  rawInput: string;
}

export interface DeepDiveRequest {
  classification: ClassificationResult;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface AnalyzeRequest {
  thoughtIds: string[];
  query: string;
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npm test -- __tests__/unit/types.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts __tests__/unit/types.test.ts
git commit -m "feat: define TypeScript types for thoughts and API responses"
```

---

### Task 3: Firebase Initialization & Firestore

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/lib/firestore.ts`
- Create: `__tests__/unit/firebase.test.ts`

- [ ] **Step 1: Write failing test for Firebase initialization**

```typescript
// __tests__/unit/firebase.test.ts
import { initializeFirebase, getFirestoreDb } from '@/lib/firebase';

describe('Firebase', () => {
  it('should initialize Firebase and return Firestore instance', () => {
    const db = getFirestoreDb();
    expect(db).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test (will fail)**

```bash
npm test -- __tests__/unit/firebase.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Create src/lib/firebase.ts**

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let db: Firestore;
let auth: Auth;

export function initializeFirebase() {
  if (getApps().length > 0) {
    const app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    return { db, auth };
  }

  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  if (process.env.NODE_ENV === 'development') {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
  }

  return { db, auth };
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

export function getAuthInstance(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}
```

- [ ] **Step 4: Create src/lib/firestore.ts**

```typescript
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import { Thought, User } from './types';

const db = getFirestoreDb();

export async function saveThought(userId: string, thought: Omit<Thought, 'createdAt' | 'updatedAt'>): Promise<string> {
  const thoughtRef = doc(collection(db, `users/${userId}/thoughts`));
  const now = new Date();
  const fullThought: Thought = {
    ...thought,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(thoughtRef, fullThought);
  return thoughtRef.id;
}

export async function getThought(userId: string, thoughtId: string): Promise<Thought | null> {
  const thoughtRef = doc(db, `users/${userId}/thoughts/${thoughtId}`);
  const snapshot = await getDoc(thoughtRef);
  return snapshot.exists() ? (snapshot.data() as Thought) : null;
}

export async function getThoughtsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  limitCount: number = 100
): Promise<Thought[]> {
  const thoughtsRef = collection(db, `users/${userId}/thoughts`);
  const q = query(
    thoughtsRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Thought);
}

export async function getAllThoughts(userId: string, limitCount: number = 1000): Promise<Thought[]> {
  const thoughtsRef = collection(db, `users/${userId}/thoughts`);
  const q = query(
    thoughtsRef,
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Thought);
}

export async function getOrCreateUser(userId: string): Promise<User> {
  const userRef = doc(db, `users/${userId}`);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as User;
  }

  const newUser: User = {
    id: userId,
    createdAt: new Date(),
    streakDays: 0,
  };

  await setDoc(userRef, newUser);
  return newUser;
}

export async function updateUserStreak(userId: string, streakDays: number): Promise<void> {
  const userRef = doc(db, `users/${userId}`);
  await setDoc(userRef, { streakDays, lastRecordedAt: new Date() }, { merge: true });
}
```

- [ ] **Step 5: Run test (should pass)**

```bash
npm test -- __tests__/unit/firebase.test.ts
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase.ts src/lib/firestore.ts __tests__/unit/firebase.test.ts
git commit -m "feat: Firebase initialization and Firestore queries"
```

---

### Task 4: Claude API Integration

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/lib/embeddings.ts`
- Create: `__tests__/unit/claude.test.ts`

- [ ] **Step 1: Write failing test for Claude classification**

```typescript
// __tests__/unit/claude.test.ts
import { classifyThought, generateDeepDiveQuestion } from '@/lib/claude';
import { ClassificationResult } from '@/lib/types';

describe('Claude Integration', () => {
  it('should classify thought input', async () => {
    const input = 'プロジェクトがうまくまとまった。全員の意見を聞くことが大事だと思った。';
    const result = await classifyThought(input);

    expect(result).toHaveProperty('event');
    expect(result).toHaveProperty('thinking');
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('emotion');
    expect(result).toHaveProperty('values');
  });

  it('should generate deep dive question', async () => {
    const classification: ClassificationResult = {
      event: 'プロジェクト統率',
      thinking: '全員の意見を拾うことが大事',
      decision: 'メンバーと1対1で話す',
      reason: '焦らないため、相手を理解するため',
      emotion: '心に余裕',
      values: '相手を尊重する',
    };

    const question = await generateDeepDiveQuestion(classification);
    expect(question).toBeDefined();
    expect(typeof question).toBe('string');
  });
});
```

- [ ] **Step 2: Run test (will fail)**

```bash
npm test -- __tests__/unit/claude.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Create src/lib/claude.ts**

> **Reference:** `docs/mentor-reference.md` for prompt design (classification, deep-dive questions, pattern analysis)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ClassificationResult } from './types';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function classifyThought(rawInput: string): Promise<ClassificationResult> {
  const prompt = `ユーザーの自由なテキスト入力を以下のカテゴリに分類してください。JSON形式で返してください。

入力: "${rawInput}"

以下の形式で返してください（必ずJSON形式）:
{
  "event": "何が起きたか",
  "thinking": "どう考えたか",
  "decision": "実際に取った行動",
  "reason": "その行動の背景・考え",
  "emotion": "その時の心理状態",
  "values": "背後にある信念・大切にしていること（推測）"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]) as ClassificationResult;
}

export async function generateDeepDiveQuestion(classification: ClassificationResult): Promise<string> {
  const prompt = `以下の思考の分類結果に基づいて、ユーザーの現在のリアルな感覚・心理状態を掘り下げる質問を1つだけ生成してください。

分類結果:
- 出来事: ${classification.event}
- 思考: ${classification.thinking}
- 行動: ${classification.decision}
- 理由: ${classification.reason}
- 感情: ${classification.emotion}
- 価値観: ${classification.values}

質問の優先順位:
1. 不足情報を聞く（現在の抽象的な表現を具体化する）
2. 背景を掘る（現在、なぜそう感じているのか）
3. 矛盾を探る（相反する感情のどちらが強いのか）

**必ず1つだけ**質問を生成してください。質問のみを返してください（説明は不要）。`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text.trim();
}

export async function analyzePatterns(thoughts: string[], query: string): Promise<string> {
  const thoughtsContext = thoughts.join('\n\n---\n\n');

  const prompt = `以下は、ユーザーの過去の思考記録です。これらから判断基準（価値観・行動パターン）を認識し、ユーザーの質問に対してYes/Noの明確なアドバイスを返してください。

【分析順序】
1. 行動パターン - 同じ場面で、いつもこう行動する
2. 心理パターン - この心理状態の時は判断が正確 / 曖昧
3. 価値観パターン - 複数の記録から、何を優先しているか
4. 成功・失敗パターン - このパターンの時は成功率が高い / 低い

【過去の思考記録】
${thoughtsContext}

【ユーザーの質問】
${query}

【アドバイス】
過去のあなたのパターンから分析したアドバイスをYes/Noで明確に答え、その理由を説明してください。`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}
```

- [ ] **Step 4: (Embeddings skip - MVP)**

MVP では embeddings/vector search を使わず、検索時は全記録を Claude に直接渡してパターン分析します。

- [ ] **Step 5: Run test (should pass with mocked Claude calls)**

```bash
npm test -- __tests__/unit/claude.test.ts --testTimeout=30000
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/claude.ts __tests__/unit/claude.test.ts
git commit -m "feat: Claude API integration for classification and analysis"
```

---

### Task 5: Vector Search Implementation

**Files:**
- Create: `src/lib/vector-search.ts`
- Create: `__tests__/unit/vector-search.test.ts`

- [ ] **Step 1: Write failing test for vector search**

```typescript
// __tests__/unit/vector-search.test.ts
import { searchSimilarThoughts } from '@/lib/vector-search';
import { Thought } from '@/lib/types';

describe('Vector Search', () => {
  it('should find similar thoughts by cosine similarity', async () => {
    const thoughts: Thought[] = [
      {
        id: '1', userId: 'user1', date: new Date(),
        rawInput: 'プロジェクトがうまくまとまった',
        event: 'project', thinking: 'teamwork', decision: 'collaborate',
        reason: 'better results', emotion: 'happy', values: 'cooperation',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        deepDiveQuestion: 'Q', createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: '2', userId: 'user1', date: new Date(),
        rawInput: '新しいタスク',
        event: 'task', thinking: 'challenge', decision: 'accept',
        reason: 'growth', emotion: 'anxious', values: 'learning',
        embedding: [0.5, 0.4, 0.3, 0.2, 0.1],
        deepDiveQuestion: 'Q', createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    const queryEmbedding = [0.15, 0.25, 0.35, 0.45, 0.55];
    const results = searchSimilarThoughts(thoughts, queryEmbedding, 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].thought.id).toBeDefined();
    expect(results[0].similarity).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test (will fail)**

```bash
npm test -- __tests__/unit/vector-search.test.ts
# Expected: FAIL - function not found
```

- [ ] **Step 3: Create src/lib/vector-search.ts**

```typescript
import { Thought } from './types';

export interface SearchResult {
  thought: Thought;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function searchSimilarThoughts(
  thoughts: Thought[],
  queryEmbedding: number[],
  topK: number = 5
): SearchResult[] {
  const similarities: SearchResult[] = thoughts.map(thought => ({
    thought,
    similarity: cosineSimilarity(thought.embedding, queryEmbedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities
    .filter(result => result.similarity > 0)
    .slice(0, topK);
}

export function formatThoughtsForAnalysis(thoughts: Thought[]): string {
  return thoughts
    .map(thought => `
出来事: ${thought.event}
思考: ${thought.thinking}
行動: ${thought.decision}
理由: ${thought.reason}
感情: ${thought.emotion}
価値観: ${thought.values}
${thought.deepDiveAnswer ? `深掘り質問への回答: ${thought.deepDiveAnswer}` : ''}
    `.trim())
    .join('\n\n---\n\n');
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npm test -- __tests__/unit/vector-search.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/vector-search.ts __tests__/unit/vector-search.test.ts
git commit -m "feat: vector search with cosine similarity"
```

---

### Task 6: API Route - Classification Endpoint

**Files:**
- Create: `src/app/api/record/classify/route.ts`

> **Reference:** `docs/DEVELOPMENT.md` for error handling patterns (API error, format error, info shortage, incomplete input)

- [ ] **Step 1: Create src/app/api/record/classify/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { classifyThought } from '@/lib/claude';
import { ClassifyRequest } from '@/lib/types';

const MIN_INPUT_LENGTH = 5;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClassifyRequest;

    if (!body.rawInput || body.rawInput.trim().length === 0) {
      return NextResponse.json(
        { error: 'rawInput is required and cannot be empty' },
        { status: 400 }
      );
    }

    // DEVELOPMENT.md: 情報不足 - テキストが短すぎて分類できない時
    if (body.rawInput.trim().length < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        { error: 'もっと詳しく教えてください（1文のみで大丈夫です）' },
        { status: 400 }
      );
    }

    const classification = await classifyThought(body.rawInput);
    return NextResponse.json(classification);
  } catch (error) {
    console.error('Classification error:', error);

    // DEVELOPMENT.md: フォーマットエラー - JSONパース失敗時
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: '申し訳ありません、もう一度詳しく説明してもらえますか？' },
        { status: 422 }
      );
    }

    // DEVELOPMENT.md: APIエラー - Claude API応答なし/タイムアウト時
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/record/classify/route.ts
git commit -m "feat: classification API endpoint with error handling from DEVELOPMENT.md"
```

---

### Task 7: API Route - Deep Dive Question Endpoint

**Files:**
- Create: `src/app/api/record/deepdive/route.ts`

- [ ] **Step 1: Create src/app/api/record/deepdive/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateDeepDiveQuestion } from '@/lib/claude';
import { ClassificationResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { classification: ClassificationResult };

    if (!body.classification) {
      return NextResponse.json({ error: 'classification is required' }, { status: 400 });
    }

    const question = await generateDeepDiveQuestion(body.classification);
    return NextResponse.json({ question });
  } catch (error) {
    console.error('Deep dive error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/record/deepdive/route.ts
git commit -m "feat: deep dive question generation endpoint"
```

---

### Task 8: API Route - Save Thought Endpoint

**Files:**
- Create: `src/app/api/record/save/route.ts`

> **Reference:** `docs/DEVELOPMENT.md` - 不完全入力でも保存し、深掘り質問で不足情報を補完

- [ ] **Step 1: Create src/app/api/record/save/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { saveThought, getOrCreateUser, updateUserStreak } from '@/lib/firestore';
import { Thought } from '@/lib/types';

interface SaveRequest {
  userId: string;
  rawInput: string;
  classification: {
    event: string;
    thinking: string;
    decision: string;
    reason: string;
    emotion: string;
    values: string;
  };
  embedding: number[];
  deepDiveQuestion: string;
  deepDiveAnswer: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveRequest;

    if (!body.userId || !body.classification) {
      return NextResponse.json(
        { error: 'userId and classification are required' },
        { status: 400 }
      );
    }

    // DEVELOPMENT.md: 不完全入力でも保存する
    await getOrCreateUser(body.userId);

    const thought: Omit<Thought, 'createdAt' | 'updatedAt'> = {
      id: '',
      userId: body.userId,
      date: new Date(),
      rawInput: body.rawInput,
      event: body.classification.event,
      thinking: body.classification.thinking,
      decision: body.classification.decision,
      reason: body.classification.reason,
      emotion: body.classification.emotion,
      values: body.classification.values,
      embedding: body.embedding || [],
      deepDiveQuestion: body.deepDiveQuestion,
      deepDiveAnswer: body.deepDiveAnswer,
    };

    const thoughtId = await saveThought(body.userId, thought);
    await updateUserStreak(body.userId, 1);

    return NextResponse.json({ thoughtId, success: true });
  } catch (error) {
    console.error('Save thought error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/record/save/route.ts
git commit -m "feat: save thought endpoint (accepts incomplete input per DEVELOPMENT.md)"
```

---

### Task 9: API Route - Search Endpoint

**Files:**
- Create: `src/app/api/search/vector/route.ts`

- [ ] **Step 1: Create src/app/api/search/vector/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllThoughts } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId: string; query: string; limit?: number };

    if (!body.userId || !body.query) {
      return NextResponse.json({ error: 'userId and query are required' }, { status: 400 });
    }

    const allThoughts = await getAllThoughts(body.userId, 1000);
    const results = allThoughts.slice(0, body.limit || 5);

    return NextResponse.json({
      query: body.query,
      results: results.map(thought => ({
        thoughtId: thought.id,
        similarity: 1,
        thought,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/search/vector/route.ts
git commit -m "feat: search endpoint for finding related thoughts"
```

---

### Task 10: API Route - Pattern Analysis Endpoint

**Files:**
- Create: `src/app/api/search/analyze/route.ts`

- [ ] **Step 1: Create src/app/api/search/analyze/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzePatterns } from '@/lib/claude';
import { getThought } from '@/lib/firestore';
import { formatThoughtsForAnalysis } from '@/lib/vector-search';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId: string; thoughtIds: string[]; query: string };

    if (!body.userId || !body.thoughtIds || !body.query) {
      return NextResponse.json(
        { error: 'userId, thoughtIds, and query are required' },
        { status: 400 }
      );
    }

    const thoughts = await Promise.all(
      body.thoughtIds.map(id => getThought(body.userId, id))
    );

    const validThoughts = thoughts.filter(t => t !== null);
    if (validThoughts.length === 0) {
      return NextResponse.json({ error: 'No valid thoughts found' }, { status: 404 });
    }

    const thoughtsContext = formatThoughtsForAnalysis(validThoughts);
    const advice = await analyzePatterns([thoughtsContext], body.query);

    return NextResponse.json({
      query: body.query,
      thoughtCount: validThoughts.length,
      advice,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/search/analyze/route.ts
git commit -m "feat: pattern analysis endpoint for personalized advice"
```

---

### Task 11: Common UI Components (Design System)

> **CRITICAL:** All components MUST follow `docs/DESIGN-brain-bot.md` specifications exactly. Use Tailwind config classes from Task 1.

**Files:**
- Create: `src/components/Common/Button.tsx`
- Create: `src/components/Common/Card.tsx`
- Create: `src/components/Common/Alert.tsx`
- Create: `src/components/Common/Loading.tsx`

- [ ] **Step 1: Create Button component (4 variants from DESIGN-brain-bot.md Section 5)**

> **Reference:** DESIGN-brain-bot.md Section 5 "Buttons" - 4 variants, 50px pill radius, scale(0.95) active state

```typescript
// src/components/Common/Button.tsx
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'outline-dark' | 'dark-text';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = [
    'font-semibold rounded-pill tracking-tight',
    'transition-all duration-200 ease-in-out',
    'active:scale-95',      // DESIGN: scale(0.95) active state
    'min-h-[44px]',         // DESIGN: WCAG AAA 44px minimum touch target
  ].join(' ');

  const variants = {
    // DESIGN: Primary Filled CTA - bg #00754A, text white, border #00754A
    'primary': 'bg-brand-accent text-white border border-brand-accent hover:bg-brand-primary disabled:bg-gray-400 disabled:border-gray-400',
    // DESIGN: Primary Outlined - bg transparent, text #00754A, border #00754A
    'outline': 'bg-transparent text-brand-accent border border-brand-accent hover:bg-brand-accent/5 disabled:border-gray-400 disabled:text-gray-400',
    // DESIGN: Outlined on Dark (on House Green band) - bg transparent, text white, border white
    'outline-dark': 'bg-transparent text-white border border-white hover:bg-white/10 disabled:border-gray-400',
    // DESIGN: Dark Text Button (top-nav sign-in) - bg transparent, text rgba(0,0,0,0.87), border rgba(0,0,0,0.87)
    'dark-text': 'bg-transparent text-[rgba(0,0,0,0.87)] border border-[rgba(0,0,0,0.87)] hover:bg-black/5 disabled:border-gray-400',
  };

  const sizes = {
    sm: 'px-4 py-[7px] text-small',
    md: 'px-4 py-[7px] text-body',
    lg: 'px-6 py-[7px] text-body-lg',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? '読込中...' : children}
    </button>
  );
}
```

- [ ] **Step 2: Create Card component (3 variants from DESIGN-brain-bot.md Section 5)**

> **Reference:** DESIGN-brain-bot.md Section 5 "Cards" - Content Card, Feature Band, Light Background Card

```typescript
// src/components/Common/Card.tsx
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'warm' | 'dark';
  className?: string;
}

export default function Card({ children, variant = 'default', className }: CardProps) {
  const variants = {
    // DESIGN: Content Card - white bg, card shadow
    'default': 'bg-white shadow-card',
    // DESIGN: Light Background Card - Neutral Warm bg
    'warm': 'bg-surface-warm',
    // DESIGN: Feature Band - House Green bg, white text
    'dark': 'bg-brand-dark text-white',
  };

  return (
    <div className={clsx(
      'rounded-card p-space-4',   // DESIGN: 12px radius, 24px padding
      variants[variant],
      // DESIGN: Card hover on desktop - shadow darker on hover
      variant === 'default' && 'hover:shadow-card-hover transition-shadow duration-150 ease-in-out',
      className
    )}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create Alert component (Success/Error from DESIGN-brain-bot.md Section 6)**

> **Reference:** DESIGN-brain-bot.md Recording Page "Success State" (auto-dismiss 2s) and "Error State" (dismissible)

```typescript
// src/components/Common/Alert.tsx
'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
}

export default function Alert({ type, message, onDismiss, autoDismiss = true }: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // DESIGN: Auto-dismiss after 2s for success, manual for error
    if (type === 'success' && autoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [type, autoDismiss, onDismiss]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-[rgba(212,233,226,0.2)] border-brand-accent text-brand-primary',
    error: 'bg-[hsl(4,82%,43%,0.05)] border-semantic-error text-semantic-error',
  };

  return (
    <div className={clsx(
      'mb-space-5 p-space-3 border rounded-card',
      'transition-opacity duration-300 ease-out',  // DESIGN: fade out 0.3s
      styles[type],
    )}>
      <div className="flex justify-between items-center">
        <p className="text-body font-medium">
          {type === 'success' && '✓ '}{message}
        </p>
        {type === 'error' && onDismiss && (
          <button
            onClick={() => { setIsVisible(false); onDismiss(); }}
            className="ml-4 text-semantic-error hover:opacity-70 transition-opacity"
            aria-label="閉じる"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Loading component**

```typescript
// src/components/Common/Loading.tsx
export default function Loading({ text = '読込中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-space-5">
      {/* DESIGN: Spinner animation rotate 360deg, 1s infinite */}
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
      <span className="ml-3 text-body text-[rgba(0,0,0,0.58)]">{text}</span>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Common/
git commit -m "feat: design system components (Button 4-variant, Card, Alert, Loading)"
```

---

### Task 12: Navigation Component (Responsive)

> **CRITICAL:** Follows `docs/DESIGN-brain-bot.md` Section 5 "Navigation" and Section 7 "Responsive Behavior"

**Files:**
- Create: `src/components/Navigation/GlobalNav.tsx`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Create GlobalNav component**

> **Reference:** DESIGN-brain-bot.md Section 5 "Navigation" - fixed top bar, responsive heights (64/72/83/99px), hamburger below 768px

```typescript
// src/components/Navigation/GlobalNav.tsx
'use client';

import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '/', label: 'ダッシュボード' },
  { href: '/record', label: '記録' },
  { href: '/search', label: '相談' },
];

export default function GlobalNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className={clsx(
        'bg-white shadow-nav sticky top-0 z-50',
        // DESIGN: Responsive nav heights
        'h-nav-xs',              // xs: 64px
        'sm:h-nav-mobile',       // mobile: 72px
        'md:h-nav-tablet',       // tablet: 83px
        'lg:h-nav-desktop',      // desktop: 99px
      )}
    >
      <nav className={clsx(
        'h-full mx-auto flex items-center justify-between max-w-7xl',
        // DESIGN: Responsive gutter tokens
        'px-gutter-xs md:px-gutter-md lg:px-gutter-lg',
      )}>
        {/* Left: Brand */}
        <a href="/" className="flex items-center">
          <span className="text-h1 font-semibold text-brand-primary">Brain Bot</span>
        </a>

        {/* Desktop nav links (visible md+) */}
        <div className="hidden md:flex gap-6 items-center">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-small font-medium tracking-tight text-[rgba(0,0,0,0.87)] hover:text-brand-primary transition-colors duration-150"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger (below 768px) */}
        <button
          className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="メニューを開く"
          aria-expanded={isMenuOpen}
        >
          <div className="space-y-1.5">
            <span className={clsx(
              'block w-6 h-0.5 bg-[rgba(0,0,0,0.87)] transition-transform duration-200',
              isMenuOpen && 'rotate-45 translate-y-2'
            )} />
            <span className={clsx(
              'block w-6 h-0.5 bg-[rgba(0,0,0,0.87)] transition-opacity duration-200',
              isMenuOpen && 'opacity-0'
            )} />
            <span className={clsx(
              'block w-6 h-0.5 bg-[rgba(0,0,0,0.87)] transition-transform duration-200',
              isMenuOpen && '-rotate-45 -translate-y-2'
            )} />
          </div>
        </button>
      </nav>

      {/* DESIGN: Mobile drawer - white bg, stacked vertically */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-surface-ceramic">
          <nav className="flex flex-col px-gutter-xs py-space-3">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="py-3 text-body font-medium tracking-tight text-[rgba(0,0,0,0.87)] hover:text-brand-primary transition-colors duration-150 min-h-[44px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Create root layout with GlobalNav**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import clsx from 'clsx';
import GlobalNav from '@/components/Navigation/GlobalNav';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Brain Bot - あなたが自分のメンター',
  description: 'あなたが自分のメンター。毎日の思考を記録し、自分のパターンを認識する。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-surface-warm">
        <div className="min-h-screen flex flex-col">
          <GlobalNav />
          <main className={clsx(
            'flex-1 mx-auto w-full max-w-7xl',
            'px-gutter-xs py-space-7',
            'md:px-gutter-md',
            'lg:px-gutter-lg',
          )}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Navigation/GlobalNav.tsx src/app/layout.tsx
git commit -m "feat: responsive GlobalNav with hamburger menu (DESIGN-brain-bot.md)"
```

---

### Task 13: Recording Page Component

> **Reference:** DESIGN-brain-bot.md Section 6 "Recording Page (/record)" - 3-phase flow

**Files:**
- Create: `src/components/Recording/InputForm.tsx`
- Create: `src/components/Recording/ClassificationView.tsx`
- Create: `src/components/Recording/DeepDiveQuestion.tsx`
- Create: `src/app/record/page.tsx`

- [ ] **Step 1: Create InputForm component**

> **Reference:** DESIGN-brain-bot.md "Phase 1: Input Form" - textarea min 120px, radio selector, full-width CTA on mobile

```typescript
// src/components/Recording/InputForm.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';

interface InputFormProps {
  onSubmit: (input: string, type: 'text' | 'audio') => void;
  isLoading?: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'audio'>('text');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input, inputType);
    }
  };

  return (
    <Card className="mb-space-6">
      <h2 className="text-h1 text-brand-primary mb-space-2">今日のこと、思いを記録しよう</h2>
      <p className="text-small text-[rgba(0,0,0,0.58)] mb-space-4">
        1分以上、自由に話してください。音声またはテキストで。
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-6 mb-space-3">
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="inputType" value="text" checked={inputType === 'text'}
              onChange={(e) => setInputType(e.target.value as 'text' | 'audio')}
              className="mr-2 accent-brand-accent" />
            <span className="text-small text-[rgba(0,0,0,0.87)]">テキスト</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="inputType" value="audio" checked={inputType === 'audio'}
              onChange={(e) => setInputType(e.target.value as 'text' | 'audio')}
              className="mr-2 accent-brand-accent" />
            <span className="text-small text-[rgba(0,0,0,0.87)]">音声</span>
          </label>
        </div>

        <div className="mb-space-4">
          {inputType === 'text' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例：今日、プロジェクトをまとめられた。焦らず全員の意見を聞くことが大事だと思った。"
              className="w-full min-h-[120px] p-3 border border-[#d6dbde] rounded-input text-body text-[rgba(0,0,0,0.87)] placeholder:text-[rgba(0,0,0,0.38)] input-focus"
            />
          ) : (
            <div className="text-center py-space-5 border-2 border-dashed border-[#d6dbde] rounded-input">
              <p className="text-[rgba(0,0,0,0.58)]">音声入力（機能開発中）</p>
            </div>
          )}
        </div>

        <Button type="submit" isLoading={isLoading} fullWidth className="md:w-auto">
          分類・深掘り質問を生成
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Create ClassificationView component**

> **Reference:** DESIGN-brain-bot.md "Phase 2: Classification Result" - warm bg, 6 fields, label Green 14px bold

```typescript
// src/components/Recording/ClassificationView.tsx
import Card from '@/components/Common/Card';
import { ClassificationResult } from '@/lib/types';

const fields: { key: keyof ClassificationResult; label: string }[] = [
  { key: 'event', label: '出来事' },
  { key: 'thinking', label: '思考' },
  { key: 'decision', label: '行動' },
  { key: 'reason', label: '理由' },
  { key: 'emotion', label: '感情' },
  { key: 'values', label: '価値観' },
];

export default function ClassificationView({ classification }: { classification: ClassificationResult }) {
  return (
    <Card variant="warm" className="mb-space-6">
      <h3 className="text-[20px] font-semibold text-brand-primary tracking-tight mb-space-4">
        AI による分類結果
      </h3>
      <div className="space-y-space-3">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <span className="text-small font-semibold text-brand-primary">{label}：</span>
            <p className="text-small text-[rgba(0,0,0,0.87)]">{classification[key]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create DeepDiveQuestion component**

> **Reference:** DESIGN-brain-bot.md "Phase 3: Deep Dive Question" - light green tint bg, question 18px, textarea min 100px

```typescript
// src/components/Recording/DeepDiveQuestion.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';

interface DeepDiveQuestionProps {
  question: string;
  onSubmit: (answer: string) => void;
  isLoading?: boolean;
}

export default function DeepDiveQuestion({ question, onSubmit, isLoading }: DeepDiveQuestionProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer);
    }
  };

  return (
    <Card className="mb-space-6 bg-brand-light/20">
      <h3 className="text-[20px] font-semibold text-brand-primary tracking-tight mb-space-3">
        AI からの質問
      </h3>
      <p className="text-[18px] leading-relaxed text-[rgba(0,0,0,0.87)] mb-space-4">{question}</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="あなたの思いを自由に書いてください"
          className="w-full min-h-[100px] p-3 border border-[#d6dbde] rounded-input text-body text-[rgba(0,0,0,0.87)] placeholder:text-[rgba(0,0,0,0.38)] input-focus mb-space-4"
        />
        <Button type="submit" isLoading={isLoading} fullWidth>保存</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Create record page (3-phase flow)**

```typescript
// src/app/record/page.tsx
'use client';

import { useState } from 'react';
import InputForm from '@/components/Recording/InputForm';
import ClassificationView from '@/components/Recording/ClassificationView';
import DeepDiveQuestion from '@/components/Recording/DeepDiveQuestion';
import Alert from '@/components/Common/Alert';
import Loading from '@/components/Common/Loading';
import { ClassificationResult } from '@/lib/types';

export default function RecordPage() {
  const [rawInput, setRawInput] = useState('');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [deepDiveQuestion, setDeepDiveQuestion] = useState('');
  const [embedding, setEmbedding] = useState<number[]>([]);
  const [isLoadingClassification, setIsLoadingClassification] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');

  const handleInputSubmit = async (input: string, type: 'text' | 'audio') => {
    setRawInput(input);
    setIsLoadingClassification(true);
    setError('');

    try {
      const response = await fetch('/api/record/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: input }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '分類に失敗しました');
      }

      const data = await response.json();
      setClassification(data);
      setEmbedding(data.embedding || []);

      const questionResponse = await fetch('/api/record/deepdive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification: data }),
      });

      if (!questionResponse.ok) throw new Error('質問生成に失敗しました');

      const questionData = await questionResponse.json();
      setDeepDiveQuestion(questionData.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsLoadingClassification(false);
    }
  };

  const handleDeepDiveSubmit = async (answer: string) => {
    if (!classification) return;
    setIsLoadingSave(true);
    setError('');

    try {
      const response = await fetch('/api/record/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'temp-user',
          rawInput,
          classification,
          embedding,
          deepDiveQuestion,
          deepDiveAnswer: answer,
        }),
      });

      if (!response.ok) throw new Error('保存に失敗しました');

      setSavedMessage('記録を保存しました！');
      setTimeout(() => {
        setRawInput('');
        setClassification(null);
        setDeepDiveQuestion('');
        setEmbedding([]);
        setSavedMessage('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsLoadingSave(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-display text-brand-primary mb-space-7">思考を記録する</h1>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} autoDismiss={false} />}
      {savedMessage && <Alert type="success" message={savedMessage} onDismiss={() => setSavedMessage('')} />}

      {!classification ? (
        <InputForm onSubmit={handleInputSubmit} isLoading={isLoadingClassification} />
      ) : (
        <>
          <ClassificationView classification={classification} />
          {deepDiveQuestion && (
            <DeepDiveQuestion question={deepDiveQuestion} onSubmit={handleDeepDiveSubmit} isLoading={isLoadingSave} />
          )}
          {isLoadingClassification && <Loading />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Recording/ src/app/record/page.tsx
git commit -m "feat: recording page with 3-phase flow (DESIGN-brain-bot.md Section 6)"
```

---

### Task 14: Search & Consultation Page

> **Reference:** DESIGN-brain-bot.md Section 6 "Search / Consultation Page (/search)"

**Files:**
- Create: `src/components/Search/QueryForm.tsx`
- Create: `src/components/Search/AdviceDisplay.tsx`
- Create: `src/app/search/page.tsx`

- [ ] **Step 1: Create QueryForm component**

```typescript
// src/components/Search/QueryForm.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';

interface QueryFormProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
}

export default function QueryForm({ onSubmit, isLoading }: QueryFormProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSubmit(query);
  };

  return (
    <Card className="mb-space-7">
      <h2 className="text-h1 text-brand-primary mb-space-2">迷った時は相談しよう</h2>
      <p className="text-small text-[rgba(0,0,0,0.58)] mb-space-4">
        過去のあなたの成功パターンから、今のあなたへのアドバイスを返します。
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：新しいプロジェクト始めるべき？"
          className="w-full min-h-[100px] p-3 border border-[#d6dbde] rounded-input text-body text-[rgba(0,0,0,0.87)] placeholder:text-[rgba(0,0,0,0.38)] input-focus mb-space-4"
        />
        <Button type="submit" isLoading={isLoading} fullWidth>相談する</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Create AdviceDisplay component**

> **Reference:** DESIGN-brain-bot.md "Advice Display" (House Green card) + "Related Thoughts" (1-2 column grid)

```typescript
// src/components/Search/AdviceDisplay.tsx
import Card from '@/components/Common/Card';
import { Thought } from '@/lib/types';

interface AdviceDisplayProps {
  query: string;
  advice: string;
  relatedThoughts?: Thought[];
}

export default function AdviceDisplay({ query, advice, relatedThoughts = [] }: AdviceDisplayProps) {
  return (
    <>
      {/* DESIGN: Advice - House Green bg, white text, 32px padding */}
      <div className="mb-space-7">
        <h2 className="text-h1 text-brand-primary mb-space-4">AI のアドバイス</h2>
        <Card variant="dark" className="p-space-5">
          <div className="text-[rgba(255,255,255,0.90)] whitespace-pre-wrap leading-relaxed text-body">
            {advice}
          </div>
        </Card>
      </div>

      {/* DESIGN: Related Thoughts - mobile 1-up, desktop 2-up */}
      {relatedThoughts.length > 0 && (
        <div>
          <h2 className="text-h1 text-brand-primary mb-space-4">参考になった過去の記録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
            {relatedThoughts.map((thought) => (
              <div
                key={thought.id}
                className="bg-white rounded-card p-space-4 border border-surface-ceramic shadow-card hover:shadow-card-hover transition-shadow duration-150 ease-in-out"
              >
                <p className="text-micro text-[rgba(0,0,0,0.58)] mb-space-2">
                  {new Date(thought.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-body font-semibold text-[rgba(0,0,0,0.87)] mb-space-2">{thought.event}</p>
                <p className="text-small text-[rgba(0,0,0,0.58)] mb-1">💭 {thought.thinking}</p>
                <p className="text-small text-[rgba(0,0,0,0.58)]">😊 {thought.emotion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create search page**

```typescript
// src/app/search/page.tsx
'use client';

import { useState } from 'react';
import QueryForm from '@/components/Search/QueryForm';
import AdviceDisplay from '@/components/Search/AdviceDisplay';
import Alert from '@/components/Common/Alert';
import Loading from '@/components/Common/Loading';
import { Thought } from '@/lib/types';

export default function SearchPage() {
  const [advice, setAdvice] = useState('');
  const [relatedThoughts, setRelatedThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastQuery, setLastQuery] = useState('');

  const handleQuerySubmit = async (query: string) => {
    setLastQuery(query);
    setIsLoading(true);
    setError('');
    setAdvice('');
    setRelatedThoughts([]);

    try {
      const userId = 'temp-user';

      const searchResponse = await fetch('/api/search/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query, limit: 5 }),
      });
      if (!searchResponse.ok) throw new Error('検索に失敗しました');

      const searchData = await searchResponse.json();
      const thoughtIds = searchData.results.map((r: any) => r.thoughtId);
      const thoughts = searchData.results.map((r: any) => r.thought);
      setRelatedThoughts(thoughts);

      const analyzeResponse = await fetch('/api/search/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, thoughtIds, query }),
      });
      if (!analyzeResponse.ok) throw new Error('分析に失敗しました');

      const analyzeData = await analyzeResponse.json();
      setAdvice(analyzeData.advice);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-display text-brand-primary mb-space-7">相談する</h1>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} autoDismiss={false} />}

      <QueryForm onSubmit={handleQuerySubmit} isLoading={isLoading} />
      {isLoading && <Loading text="検索・分析中..." />}
      {advice && <AdviceDisplay query={lastQuery} advice={advice} relatedThoughts={relatedThoughts} />}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Search/ src/app/search/page.tsx
git commit -m "feat: search page with advice and related thoughts (DESIGN-brain-bot.md)"
```

---

### Task 15: Dashboard Page

> **Reference:** DESIGN-brain-bot.md Section 6 "Dashboard / Home Page (/)"

**Files:**
- Create: `src/components/Dashboard/StreakDisplay.tsx`
- Create: `src/components/Dashboard/CalendarView.tsx`
- Create: `src/components/Dashboard/RecentThoughts.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create StreakDisplay component**

> **Reference:** DESIGN-brain-bot.md "Streak Display" - House Green bg, large number 48px weight 700, emoji, secondary text on dark

```typescript
// src/components/Dashboard/StreakDisplay.tsx
export default function StreakDisplay({ streakDays }: { streakDays: number }) {
  return (
    <div className="bg-brand-dark text-white rounded-card shadow-card py-space-6 px-space-4 text-center">
      <div className="text-6xl mb-3">🔥</div>
      <p className="text-[48px] font-bold tracking-tight mb-1">{streakDays} 日</p>
      <p className="text-[rgba(255,255,255,0.70)] text-body-lg">連続で記録しています！</p>
    </div>
  );
}
```

- [ ] **Step 2: Create CalendarView component**

> **Reference:** DESIGN-brain-bot.md "Calendar View" - 7-column grid, cells 48x48px min, recorded = Green Accent, hover brightness

```typescript
// src/components/Dashboard/CalendarView.tsx
import { Thought } from '@/lib/types';

export default function CalendarView({ thoughts, month = new Date() }: { thoughts: Thought[]; month?: Date }) {
  const year = month.getFullYear();
  const monthNum = month.getMonth();
  const firstDay = new Date(year, monthNum, 1);
  const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay();

  const recordedDates = new Set(
    thoughts
      .filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === monthNum; })
      .map(t => new Date(t.date).getDate())
  );

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white rounded-card shadow-card p-space-4">
      <h3 className="text-h2 text-[rgba(0,0,0,0.87)] mb-space-4">{year}年 {monthNum + 1}月</h3>
      <div className="grid grid-cols-7 gap-2 mb-space-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-small font-semibold text-[rgba(0,0,0,0.58)] py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => (
          <div
            key={i}
            className={[
              'min-w-[48px] min-h-[48px] flex items-center justify-center',
              'rounded-card text-small font-medium',
              'transition-all duration-150 ease-in-out',
              day !== null ? 'cursor-pointer hover:brightness-95' : '',
              day === null ? ''
                : recordedDates.has(day) ? 'bg-brand-accent text-white'
                : 'bg-surface-cool text-[rgba(0,0,0,0.58)]',
            ].join(' ')}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create RecentThoughts component**

> **Reference:** DESIGN-brain-bot.md "Recent Thoughts Card" - date 13px, event 16px bold, emoji prefixes, dividers

```typescript
// src/components/Dashboard/RecentThoughts.tsx
import { Thought } from '@/lib/types';
import Card from '@/components/Common/Card';

export default function RecentThoughts({ thoughts }: { thoughts: Thought[] }) {
  return (
    <Card>
      <h3 className="text-h1 mb-space-3">最近の記録</h3>
      {thoughts.length === 0 ? (
        <p className="text-[rgba(0,0,0,0.58)] text-center py-space-5">
          まだ記録がありません。<br />
          <a href="/record" className="text-brand-accent hover:underline font-medium">思考を記録する</a>
        </p>
      ) : (
        <div>
          {thoughts.slice(0, 5).map(thought => (
            <div key={thought.id} className="py-space-3 border-b border-surface-ceramic last:border-b-0">
              <p className="text-micro text-[rgba(0,0,0,0.58)] mb-1">
                {new Date(thought.date).toLocaleDateString('ja-JP')}
              </p>
              <p className="text-body font-semibold text-[rgba(0,0,0,0.87)] mb-1">{thought.event}</p>
              <p className="text-small text-[rgba(0,0,0,0.58)]">💭 {thought.thinking}</p>
              <p className="text-small text-[rgba(0,0,0,0.58)]">😊 {thought.emotion}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Create dashboard home page**

> **Reference:** DESIGN-brain-bot.md - 2-column grid on desktop, stacked on mobile, 48px section spacing, 40px grid gap

```typescript
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import StreakDisplay from '@/components/Dashboard/StreakDisplay';
import CalendarView from '@/components/Dashboard/CalendarView';
import RecentThoughts from '@/components/Dashboard/RecentThoughts';
import Loading from '@/components/Common/Loading';
import { Thought, User } from '@/lib/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setUser({ id: 'temp-user', createdAt: new Date(), streakDays: 0 });
        setThoughts([]);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1 className="text-display text-brand-primary mb-space-7">ダッシュボード</h1>
      {user && (
        <>
          <div className="mb-space-7">
            <StreakDisplay streakDays={user.streakDays} />
          </div>
          {/* DESIGN: 2-column on desktop (calendar + thoughts), stacked on mobile, gap 40px */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-6">
            <div className="md:col-span-2">
              <CalendarView thoughts={thoughts} />
            </div>
            <div>
              <RecentThoughts thoughts={thoughts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard/ src/app/page.tsx
git commit -m "feat: dashboard with streak, calendar, recent thoughts (DESIGN-brain-bot.md)"
```

---

### Task 16: Testing, Jest Configuration & Design Verification

**Files:**
- Create: `jest.config.js`
- Create: `__tests__/setup.ts`

- [ ] **Step 1: Create Jest config**

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterSetup: ['<rootDir>/__tests__/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

module.exports = createJestConfig(customJestConfig)
```

- [ ] **Step 2: Create Jest setup file**

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom'

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  connectAuthEmulator: jest.fn(),
}))
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --testPathPattern="__tests__" --passWithNoTests
# Expected: All tests pass
```

- [ ] **Step 4: Build check**

```bash
npm run build
# Expected: Build succeeds
```

- [ ] **Step 5: Design system compliance verification**

> Manual checklist from DESIGN-brain-bot.md Section 12:

- [ ] Colors as CSS variables AND Tailwind config (brand-*, surface-*, semantic-*)
- [ ] Typography scale: display/h1/h2/body-lg/body/small/micro with Inter/Manrope
- [ ] Letter spacing: -0.01em on all text
- [ ] Spacing tokens: space-1 through space-9
- [ ] Gutter tokens: gutter-xs (16px), gutter-md (24px), gutter-lg (40px)
- [ ] Button: 4 variants (primary/outline/outline-dark/dark-text), pill radius 50px
- [ ] Button: active state scale(0.95), min touch target 44px
- [ ] Card: 3 variants (default/warm/dark), 12px radius, layered shadows
- [ ] Card: hover shadow on desktop
- [ ] Alert: success auto-dismiss 2s, error manual dismiss, fade out animation
- [ ] Input: green focus glow (0 0 0 2px rgba(0,117,74,0.1)), 4px radius
- [ ] Navigation: responsive heights (64/72/83/99px)
- [ ] Navigation: hamburger menu below 768px, drawer from left
- [ ] Dashboard: streak (House Green, 48px number) + calendar + recent thoughts
- [ ] Calendar: 48x48px cells, Green Accent for recorded, hover brightness
- [ ] Recent Thoughts: date/event/thinking/emotion with emoji prefixes
- [ ] Recording: 3-phase flow (input -> classification -> deep-dive)
- [ ] Search: advice (House Green card) + related thoughts (2-column grid)
- [ ] Responsive: xs/mobile/tablet/desktop breakpoints tested
- [ ] Page canvas: warm cream #f2f0eb (NOT pure white)
- [ ] Body text: rgba(0,0,0,0.87) (NOT pure black)
- [ ] No gradients (color-block only)
- [ ] Loading: spinner + text centered

- [ ] **Step 6: Commit**

```bash
git add jest.config.js __tests__/setup.ts
git commit -m "test: Jest config and design system verification checklist"
```

---

## Summary

**Total Tasks:** 16
**Design System:** Fully integrated from `docs/DESIGN-brain-bot.md`

**Changes from Previous Plan:**
1. Tailwind config + design tokens moved to Task 1 (before any components)
2. 4 Button variants (primary, outline, outline-dark, dark-text) per DESIGN spec
3. Alert component with auto-dismiss 2s (success) / manual dismiss (error)
4. GlobalNav with responsive heights (64/72/83/99px) + mobile hamburger
5. Responsive gutter tokens (gutter-xs/md/lg) used throughout
6. Typography scale (display/h1/h2/body-lg/body/small/micro) matches DESIGN spec
7. Spacing tokens (space-1 to space-9) used consistently
8. Micro-interactions: button scale(0.95), input focus glow, card hover, calendar hover, alert fade
9. Error handling follows DEVELOPMENT.md 4 patterns
10. Touch targets 44px minimum (WCAG AAA)
11. Design verification checklist in final task

**Next Steps After MVP:**
1. Firebase Authentication (Google login)
2. Real audio input with Web Speech API
3. Streak calculation logic
4. Data export
5. Push notifications
6. Dark mode (DESIGN-brain-bot.md Section 9)
