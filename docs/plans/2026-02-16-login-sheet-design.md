# Login Sheet Design

## Context

Guests land on the canvas via Supabase anonymous auth. When they want to sign in (or after N interactions), a login sheet slides up over the canvas using the existing FullScreenSheet component.

The sheetStore already supports `contentType: 'login'`. Trigger: `useSheetStore.getState().open(null, 'login')`.

## Layout

```
┌──────────────────────────────────────────────┐
│ [X]                                          │  SheetHeader (pill close, top-left)
│                                              │
│                                              │
│              ✦ Domus                         │  Kalice Trial, text-title
│                                              │
│        Your spatial workspace.               │  text-on-surface-muted, text-body
│                                              │
│        ┌─────────────────────────┐           │
│        │  G  Continue with Google│           │  pill button, max-w-sm, h-11
│        └─────────────────────────┘           │
│                                              │
│     By continuing, you agree to the          │  text-label, text-on-surface-muted
│     Terms of Service and Privacy Policy.     │
│                                              │
└──────────────────────────────────────────────┘
```

Content centered vertically in sheet body. Single Google OAuth action.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LoginSheetContent` | `core/auth/LoginSheetContent.tsx` | Wordmark, tagline, Google button, legal text |
| `GoogleSignInButton` | `core/auth/GoogleSignInButton.tsx` | Pill button with Google SVG, calls `signInWithOAuth` |
| `SpaceSheet` (edit) | `core/sheet/SpaceSheet.tsx` | Route `contentType === 'login'` to `LoginSheetContent` |

## Design decisions

- **Single action** — Google only per architecture. No email/Apple/SSO.
- **Pill button** — `pill-base` variant, wider (full-width max-w-sm), taller (h-11) for CTA presence. Google "G" SVG inline.
- **Centered** — Content floats in middle of sheet body. Canvas visible as dimmed backdrop.
- **Close dismisses** — Guest continues on canvas. No forced sign-in.
- **No loading state** — Browser redirects to Google OAuth page immediately.
