# Academix
Verified academic social network: college hubs, major explorer, peer mentorship booking, Q&amp;A inbox, and an AI admissions advisor. React + TypeScript + Vite.

## Authentication

`npm run dev` starts the Vite app and its local authentication API. The API stores accounts in `server/data/users.json` (ignored by Git) and stores only salted scrypt password hashes. New passwords must be at least 12 characters. The browser receives an HTTP-only, SameSite session cookie; production deployments must serve the app and `/api/auth` over HTTPS and should use persistent, access-controlled storage for account data and sessions.

For a production deployment, run `node server/auth.mjs` as the API service and route `/api/auth` to it from the same origin as the frontend. Set `NODE_ENV=production` so session cookies use the Secure flag. The included API is a small single-process service; its sessions are held in memory and clear when it restarts, so a production multi-instance deployment should replace that session store with a shared persistent store.
