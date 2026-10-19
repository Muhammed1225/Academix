# Academix
Verified academic social network: college hubs, major explorer, peer mentorship booking, Q&amp;A inbox, and an AI admissions advisor. React + TypeScript + Vite.

## Authentication

`npm run dev` starts the Vite app and its local authentication API. The API stores accounts in `server/data/users.json` (ignored by Git) and stores salted scrypt password hashes. New passwords must be at least 12 characters and include a letter, a number, an uppercase letter, and a special character. Any valid email address is accepted; `.edu` is not required. Student / scholar and faculty / representative accounts can optionally request Gold verification using either an institutional `.edu` email or an appropriate student, faculty, or work ID (PDF, JPG, or PNG, up to 5 MB). Requests are marked pending review and do not grant a verified badge automatically; accounts without a verification request remain unverified.

Identity documents are stored separately in `server/data/verification-documents` under generated filenames with restrictive file permissions. This demo does not include an administrator review or document deletion interface; production deployments must add access-controlled review, retention, and deletion workflows before collecting real identity documents. The browser receives an HTTP-only, SameSite session cookie; production deployments must serve the app and `/api/auth` over HTTPS and use persistent, access-controlled storage for account data, identity documents, and sessions.

For a production deployment, run `node server/auth.mjs` as the API service and route `/api/auth` to it from the same origin as the frontend. Set `NODE_ENV=production` so session cookies use the Secure flag. The included API is a small single-process service; its sessions are held in memory and clear when it restarts, so a production multi-instance deployment should replace that session store with a shared persistent store.
