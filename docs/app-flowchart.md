# Mani Library app — user flow

Simple flow: **brand page first**, then **Sign in**, then **Student** or **Admin** based on role. Sign out returns to the brand page.

## Flowchart (Mermaid)

Paste into [mermaid.live](https://mermaid.live), GitHub, Notion, or any Mermaid viewer.

```mermaid
flowchart TD
  START([Open app]) --> BRAND[Library home — brand page]
  BRAND --> SIGNIN{Tap Sign in or Join?}
  SIGNIN -->|No| BRAND
  SIGNIN -->|Yes| LOGIN[Sign in page]
  LOGIN --> BACK{Back to library home?}
  BACK -->|Yes| BRAND
  BACK -->|No| PICK[Pick Student or Admin]
  PICK --> TYPE[Email or phone + password]
  TYPE --> CHECK{Login OK?}
  CHECK -->|No| TRYAGAIN[Show error — try again]
  TRYAGAIN --> LOGIN
  CHECK -->|Yes| WHO{Role?}
  WHO -->|Student| STUDENT[Student area — tabs]
  WHO -->|Admin| ADMIN[Admin area — dashboard]
  STUDENT --> LEAVE1{Sign out?}
  ADMIN --> LEAVE2{Sign out?}
  LEAVE1 -->|Yes| BRAND
  LEAVE2 -->|Yes| BRAND
  LEAVE1 -->|No| STUDENT
  LEAVE2 -->|No| ADMIN
```

## Plain language

1. Open the app → you land on the **library home** (branding: story, facilities, contact). No account needed.
2. Tap **Sign in** or **Join** → **Sign in** screen: choose **Student** or **Admin**, enter details.
3. If login succeeds → **Student** sees student tabs; **Admin** sees the admin shell.
4. **Sign out** → back to **library home** (brand page).

## How this maps in the codebase

| Step | Route / behavior |
|------|------------------|
| Library home (cold start) | `app/_layout.tsx` — `initialRouteName: '(student)'`; Home tab is `app/(student)/index.tsx` → `LandingScreen` |
| Sign in | `app/(auth)/login.tsx`; entry from landing links to `/(auth)/login` |
| After login | `AuthProvider` — `router.replace` to `/(student)` or `/(admin)` from server/user role |
| Sign out | `AuthProvider` — `router.replace('/(student)')` |
| Signed out but opened admin URL | `app/(admin)/_layout.tsx` — `Redirect` to `/(student)` |
