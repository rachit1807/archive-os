<div align="center">

# ARCHIVEOS
### Your world. Under control.

A personal collection and lending command center with an emerald reactor aesthetic, persistent file storage, and a responsive interface.

<p>
<img src="https://cdn.simpleicons.org/javascript/F7DF1E" width="38" alt="JavaScript" /> &nbsp;
<img src="https://cdn.simpleicons.org/nodedotjs/5FA04E" width="38" alt="Node.js" /> &nbsp;
<img src="https://cdn.simpleicons.org/html5/E34F26" width="38" alt="HTML5" /> &nbsp;
<img src="https://cdn.simpleicons.org/css/663399" width="38" alt="CSS" /> &nbsp;
<img src="https://cdn.simpleicons.org/docker/2496ED" width="38" alt="Docker" /> &nbsp;
<img src="https://cdn.simpleicons.org/githubactions/2088FF" width="38" alt="GitHub Actions" />
</p>

</div>

## Overview

ArchiveOS gives books, technology, collectibles, and games a permanent home. Register possessions, organize the details, record loans, and keep track of what should come back. The interface combines gunmetal surfaces, emerald illumination, a geometric mask, animated rune orbits, and restrained typography.

## Features

- **Collection management:** create, edit, delete, and favorite items; record category, condition, location, value, description, and tags.
- **Lending:** borrower and return-date records, overdue indicators, one-click returns, and recent lending history.
- **Discovery:** live search, category filters, and sorting by name, value, or date.
- **Overview:** inventory count, total estimated value, active loans, and overdue returns.
- **Portability:** JSON export and validated import; imported records receive fresh identifiers.
- **Durability:** server-side JSON text storage, serialized mutations, atomic replacement, and a previous-version backup.
- **Appearance:** persistent light/dark preference, responsive navigation and cards, keyboard focus states, and reduced-motion support.
- **Developer workflow:** no runtime dependencies, native Node.js tests, Docker support, and CI.

## Run locally

Requires **Node.js 22 or newer**.

```sh
npm start
```

Open **http://localhost:3000**. No dependency installation or build step is required.

```sh
npm run dev   # Restart the server when server files change
npm test      # Storage durability and recovery safeguards
```

Start with an empty vault or choose **Load sample collection**. Sample data is fictional and is stored in the same vault as regular items.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listening port |
| `DATA_DIR` | `./data` | Directory for persistent archive files |
| `ARCHIVE_PASSWORD` | unset | Optional HTTP Basic protection for API routes; username is `archive` |

Set a strong `ARCHIVE_PASSWORD` before exposing a personal vault to the internet. Use HTTPS in production. Without a password, anyone who can access the server can read and modify its collection. This is a single-owner application, not a multi-tenant account system.

## Architecture

```text
Browser interface
      │ same-origin JSON requests
      ▼
Node.js HTTP server → input validation
      │ serialized mutations
      ▼
archive.json.tmp → atomic rename → archive.json
                                      │
                               archive.json.bak
```

| Path | Responsibility |
| --- | --- |
| `public/` | Interface, original vector artwork, theme, and interactions |
| `server.js` | HTTP routes, validation, optional authentication, static assets |
| `storage.js` | File reads, write queue, backups, atomic persistence |
| `test/` | Automated storage tests |
| `.github/workflows/ci.yml` | Continuous verification |
| `Dockerfile` | Unprivileged container runtime |

## API

| Method | Route | Action |
| --- | --- | --- |
| GET | `/api/health` | Service health |
| GET | `/api/items` | Read the archive |
| POST | `/api/items` | Create an item |
| PUT | `/api/items/:id` | Update an item |
| DELETE | `/api/items/:id` | Delete an item |
| POST | `/api/import` | Append a validated version-1 export |

Item fields include `name`, `category`, `condition`, `value`, `location`, `description`, `tags`, `borrower`, `due`, and `favorite`. Dates use `YYYY-MM-DD`; values are displayed in INR. The server assigns IDs and timestamps. Import accepts up to 5,000 items and a 1 MB request body.

## Persistence and recovery

The first read creates the storage directory. An absent archive starts empty. Invalid JSON is reported as an error and is never silently replaced. A successful mutation saves the prior archive to `archive.json.bak`, writes a temporary file, and renames it into place.

To recover, stop the server, preserve the damaged file separately, validate the backup as JSON with a `version: 1` and an `items` array, then copy the backup to `archive.json` and restart. Export regularly for off-device backups.

The write queue protects one server process. Run **one instance** against the data directory. Multiple processes, distributed deployments, and network filesystems require a different locking/storage design.

## Deployment

Run this app as a persistent Node.js service or container. Mount a persistent disk and set `DATA_DIR` to that mount. Ephemeral filesystems lose records on redeploy; static hosting and GitHub Pages cannot run the backend.

```sh
docker build -t archive-os .
docker run --rm -p 3000:3000 -v archive-data:/app/data -e ARCHIVE_PASSWORD archive-os
```

The Docker command forwards `ARCHIVE_PASSWORD` from your shell environment. Set it before starting the container. Configure an HTTPS reverse proxy or a managed host with automatic HTTPS.

## Accessibility and motion

Semantic controls, labeled forms, visible focus indicators, native modal dialogs, and live status messages support keyboard use. Decorative effects are hidden from assistive technology. Animations stop when the operating system requests reduced motion.

## Design notes

This is an independent fan-inspired portfolio project. Doctor Doom and related characters belong to their respective rights holders. The interface uses original SVG geometry and CSS effects; no official movie artwork is included. Google Fonts and README technology icons require an internet connection; local font fallbacks remain available.

## Author

**Rachit Tripathi**
