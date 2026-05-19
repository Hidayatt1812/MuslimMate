# Quran Foundation API Usage

This document is the hackathon-facing description of how MuslimMate uses Quran Foundation APIs and how the integration is secured.

## Security Architecture

MuslimMate does not keep `QF_CLIENT_SECRET` in the Expo/mobile bundle.

Runtime flow:

1. The app opens Quran.com hosted OAuth login with PKCE.
2. The app receives the authorization `code`.
3. The app sends `code`, `codeVerifier`, and `redirectUri` to the MuslimMate backend proxy.
4. The backend proxy exchanges or refreshes tokens with Quran Foundation using `QF_CLIENT_SECRET`.
5. Content, Search, and User API calls are forwarded through the backend proxy.

Proxy implementation:

- Supabase Edge Function: `supabase/functions/qf-proxy/index.ts`
- Mobile proxy base env: `EXPO_PUBLIC_QF_PROXY_BASE_URL`
- Server-only secrets: `QF_CLIENT_ID`, `QF_CLIENT_SECRET`

## Required Environment Variables

Mobile app:

```env
EXPO_PUBLIC_QF_CLIENT_ID=your_qf_client_id
EXPO_PUBLIC_QF_PROXY_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/qf-proxy
EXPO_PUBLIC_QF_OAUTH_BASE=https://prelive-oauth2.quran.foundation
```

Supabase Edge Function secrets:

```bash
supabase secrets set QF_ENV=prelive
supabase secrets set QF_CLIENT_ID=your_qf_client_id
supabase secrets set QF_CLIENT_SECRET=your_qf_client_secret
supabase secrets set QF_ALLOWED_ORIGIN=*
supabase functions deploy qf-proxy
```

Use matching environments:

- `QF_ENV=prelive` with `https://prelive-oauth2.quran.foundation`
- `QF_ENV=production` with `https://oauth2.quran.foundation`

Do not mix prelive and production OAuth/user data.

## Proxy Endpoints

Health:

- `GET /health`

OAuth and User APIs:

- `POST /oauth/exchange`
- `POST /oauth/refresh`
- `GET /user/bookmarks`
- `POST /user/bookmarks`
- `DELETE /user/bookmarks/:id`
- `POST /user/reading-sessions`

Content APIs:

- `GET /content/chapters`
- `GET /content/verses/by_chapter/:chapterNumber`
- `GET /content/verses/by_key/:verseKey`
- `GET /content/recitations/:recitationId/by_chapter/:chapterNumber`
- `GET /content/tafsirs/:tafsirId/by_chapter/:chapterNumber`
- `GET /content/tafsirs/:tafsirId/by_ayah/:verseKey`

Search API:

- `GET /search?mode=advanced&query=...`
- `GET /search?mode=quick&query=...`

## Hackathon Requirement Mapping

### Content API

MuslimMate uses Quran Foundation Content APIs through `src/services/quranFoundationService.ts`.

| Requirement | MuslimMate Usage |
|---|---|
| Ayat | Daily Verse and Quran Finder fetch verses by `verse_key`. |
| Translation | Verse requests include translation IDs based on app language. |
| Tafsir | `fetchQFTafsirByAyah` and `fetchQFTafsir` call tafsir endpoints through the proxy. |
| Audio | `fetchQFAudioRecitations` calls recitation audio metadata through the proxy. |
| Search | Quran Finder free-text search uses Quran Foundation Search API, then hydrates results with verse text and translation. |

### User API

MuslimMate uses Quran Foundation User APIs through `src/services/quranFoundationAuthService.ts`.

| Requirement | MuslimMate Usage |
|---|---|
| OAuth login | Quran.com hosted login with PKCE. |
| Bookmark | Quran reader syncs saved verse bookmarks to Quran.com when the user is logged in. |
| Reading session | Quran reader logs reading sessions when the user opens/continues an ayah. |
| Sync visibility | Login screen and More tab show Quran.com connection status. |

## Submission Summary

MuslimMate integrates Quran Foundation APIs to help users build a daily Quran habit:

- Read a daily Quran verse with trusted Arabic text and translation.
- Search the Quran by emotion or topic using Quran Foundation Search API.
- Open Quran results directly in the reader.
- Sync Quran.com bookmarks and reading sessions via User APIs.
- Keep Quran Foundation credentials safe by routing all secret-backed requests through a backend proxy.

## Files Involved

- `supabase/functions/qf-proxy/index.ts`
- `src/services/quranFoundationService.ts`
- `src/services/quranFoundationAuthService.ts`
- `src/app/login.tsx`
- `src/app/quran-finder.tsx`
- `src/app/quran/[surahId].tsx`
