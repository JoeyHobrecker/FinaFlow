# Task Manager

This repository now includes a small Node.js backend used for optional data synchronisation.

## Backend

The backend lives in the `server/` directory. It exposes a REST API that mirrors the client IndexedDB stores (`tasks`, `projects` and `notes`).

### Setup

1. Install dependencies
   ```bash
   cd server
   npm install
   ```
2. Start the server
   ```bash
   JWT_SECRET=mysecret npm start
   ```

The server uses `lowdb` so data is persisted to `server/db.json`.

### Authentication

`POST /api/register` accepts `{username, password}` and creates a new user. It returns a JWT token.

`POST /api/login` accepts `{username, password}` for existing users. The response contains a JWT token which must be sent in the `Authorization` header for other API calls.

### Data Endpoints

- `GET /api/all` – fetch all data for the authenticated user.
- `PUT /api/tasks` – replace tasks array.
- `PUT /api/projects` – replace projects array.
- `PUT /api/notes` – replace notes array.

Deploy this server to any Node hosting provider (Heroku, AWS, etc.) and set `JWT_SECRET` accordingly.

## Frontend Sync

`finaflow.html` now contains helper functions that attempt to sync data with the server when online. A **Sync** button is available in the Data Management section. The authentication token is stored in the `settings` Dexie store for reuse.

When offline the application continues to use local IndexedDB storage as before.

The login screen remembers the last used username and password in `localStorage` so returning users can sign in without re-entering credentials.
