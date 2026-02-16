# Dark Mode + Settings App

## Goal

Add a Settings app to the dock with a working Light/Dark/System theme toggle. All dark-mode tokens already exist in `tokens.css`; this feature wires up the switching mechanism and gives users a UI to control it.

## Architecture

### Theme Store (`core/themeStore.ts`)

Zustand store with three values:

- `mode`: user's choice — `'light' | 'dark' | 'system'`
- `resolved`: effective theme after evaluating system preference — `'light' | 'dark'`
- `setMode(mode)`: updates mode, persists to `localStorage('domus-theme')`, applies `data-theme` to `<html>`

When `mode === 'system'`, the store subscribes to `matchMedia('(prefers-color-scheme: dark)')` and updates `resolved` reactively. Cleans up the listener when mode changes away from `system`.

The existing inline script in `layout.tsx` handles the pre-hydration read from localStorage to prevent FOUC. The store picks up the same key on mount.

### Settings App (`apps/settings/`)

Standard `BuiltInApp` following chat/calendar pattern:

- **type:** `'settings'`
- **icon:** `Settings` from lucide-react
- **defaultPresentation:** `'window'`
- **defaultSize:** `{ width: 280, height: 200 }`
- **maxInstances:** `1`

UI: a heading "Appearance" with a three-segment pill toggle (Light / Dark / System). Active segment uses `pill-active` variant, inactive uses `pill-secondary`. Reads and writes `useThemeStore` directly.

### Layout Script Alignment

The existing inline script in `layout.tsx` reads `localStorage.getItem('domus-theme')` and sets `data-theme`. It currently only handles `'light'` and `'dark'` literal values. Update it to also handle `'system'` by evaluating `matchMedia` when the stored value is `'system'`.

## Files

| File | Change |
|---|---|
| `core/themeStore.ts` | New Zustand store |
| `apps/settings/SettingsApp.tsx` | New theme toggle component |
| `apps/settings/index.ts` | New app definition |
| `apps/_registry.ts` | Register settings app |
| `app/layout.tsx` | Update inline script to handle `'system'` mode |

## Design Principles

- **P1 (Token-Only Color):** Toggle uses existing pill tokens
- **P11 (Respect Preferences):** System option honors `prefers-color-scheme`
- **Everything is an Entity:** Settings app is a standard entity on the canvas
