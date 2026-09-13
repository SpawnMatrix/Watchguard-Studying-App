# WatchGuard Study Lab

A high-performance, responsive self-hosted interactive study companion designed for junior security engineers preparing for the WatchGuard NSE Certification.

This portal features an interactive **Firebox Live Network & Interface Simulator**, a **Practice Quiz Engine** with full-syllabus coverage, **Hands-on Labs** walkthrough guides, and a **Certification Readiness Reports** dashboard. It is designed to be **100% self-hosted, offline-capable**, with optional server-side Gemini AI features.


## Study upgrade

- **496 authored questions**, including a 16-scenario diagram section and 73 multi-select items, with Local Firebox as the default track plus Network+ and WatchGuard Cloud filters.
- **42 reproducible scenario templates** generate fresh IPs, subnets, ports, routing decisions, and troubleshooting cases. Grading is deterministic and works without AI.
- **Traffic Monitor log analysis**: read a simulated Fireware log line and identify why the packet was dropped — unhandled packet, explicit deny, ProxyDrop, spoofing, Blocked Sites, missing route, inactive schedule, or a BOVPN tunnel-route miss.
- **Interactive policy ordering**: drag five firewall policies into the correct top-to-bottom processing order. Graded on sequence, and fully usable by keyboard.
- **Spaced repetition (Leitner)**: five boxes with 0/1/3/7/21-day intervals, plus a topic layer that automatically weights your weak areas into future questions.
- **"Explain like I'm an L1"**: on a missed answer, a beginner-level breakdown citing the Fireware Web UI menu path and the underlying Network+ concept. Works with AI disabled.
- **300 flashcards**, resumable quizzes and mock exams, and a weakness deck that requires three correct answers to clear a concept.
- **Username + six-digit PIN**, recovery codes, account-specific server saves, conflict handling, and optional import of existing browser progress.
- Study Home with observed topic accuracy, recent practice comparisons, activity, and a saved-quiz resume action; all six existing study sections remain available.
- Persistent learning-track selection, filtered Q&A and flashcards, and explicit track changes for saved quizzes.
- Inline SVG network diagrams with keyboard-accessible node/edge hotspots, packet-flow animation, and light/dark themes. Content authors: [stable topology v1 contract and track behavior](docs/visual-workstream.md).

Read [engine and compatibility](docs/study-engine.md), [source/reuse audit](docs/content-sources.md), and [persistent deployment and backups](docs/deployment-data.md). Use Node >=22.13. Keep the Compose data volume across upgrades. This independent practice tool does not guarantee an exam result; check the current objectives and Fireware version.


---

## 🔐 Security configuration

The portal is designed to run internet-facing. Four settings decide whether
its protections actually work — set them deliberately rather than leaving
them at defaults that suit a LAN.

| Variable | Default | What it does |
| --- | --- | --- |
| `TRUSTED_PROXY_HOPS` | `0` | Number of reverse proxies in front of the app. **This value decides which address rate limiting treats as the client.** Set `1` behind a single Pangolin/Traefik/nginx layer. Leaving it at `0` while proxied means every limiter counts the proxy instead of the visitor. |
| `TRUSTED_PROXY_CIDR` | unset | Alternative to the hop count: an explicit list of proxy addresses or CIDRs. Takes precedence when set. |
| `COOKIE_SECURE` | `true` in production | Whether session cookies carry `Secure`. Set `false` **only** for plain-HTTP LAN use — otherwise browsers silently discard the cookie over HTTP and sign-in appears to do nothing. |
| `ADMIN_BOOTSTRAP_USER` | unset | The account registered with this username becomes the first administrator. |
| `ADMIN_PASSWORD` | unset | Optional break-glass credential. The server **refuses to start** if it is a known default (`admin123`, `admin`, `password`, `changeme`, `watchguard`) or shorter than 12 characters. |

### How administrator access works

Administrator authority is a role on a study account, not a shared password.

1. Set `ADMIN_BOOTSTRAP_USER=yourname` and register that account — it is an
   administrator immediately.
2. Or, with `ADMIN_PASSWORD` set, sign in to your study account and enter the
   password once in the admin console. That promotes your account, and you
   never need the password again.
3. Further administrators are promoted from the console by an existing one.

Administrator sessions are separate from study sessions, live in an
`HttpOnly` cookie, and expire after 30 minutes of inactivity. Demoting an
account revokes its administrator sessions immediately, and the last
remaining administrator cannot be removed.

### Authentication protections

- **Layered throttling.** Three persisted buckets — per username, per source
  address across *all* usernames, and a global failure floor — so guessing one
  account, spraying one PIN across many accounts, and distributed spraying are
  each bounded. State lives in SQLite, so restarting the container does not
  reset an attack in progress.
- **PIN strength.** Repeats, straight runs (including wraparound), repeated
  groups and embedded years are rejected when a PIN is set. Strength is never
  checked at sign-in, so the error message cannot be used to probe.
- **Versioned hashing.** Every stored secret records the key-derivation scheme
  that produced it and is transparently re-hashed on the next successful
  sign-in, so the work factor can be raised later without invalidating
  existing credentials.
- **Session lifecycle.** Rolling idle timeout, a per-account session cap, and
  `POST /api/account/logout-everywhere` to sign out every device.

### Container hardening

The image runs as the unprivileged `node` user and execs node directly, so it
tolerates a read-only root filesystem. Both Compose files set `read_only`,
`cap_drop: ALL`, `no-new-privileges` and a tmpfs for `/tmp`. Health checks use
`/healthz`, which touches no authentication or database code.

> Upgrading an existing deployment: the database migration is additive and
> preserves all accounts and study progress. Keep the `study-data` volume.
> After upgrading, set `TRUSTED_PROXY_HOPS` and `COOKIE_SECURE` to match your
> deployment before letting learners back in.

---

## 🚀 Proxmox VE Deployment Guides

Proxmox VE is the ideal hypervisor to self-host this application. Below are the two most efficient ways to run this training portal on your Proxmox server: **Method A (Lightweight LXC Container)** or **Method B (Docker Compose inside a VM/LXC)**.

### Method A: Lightweight LXC Container (Recommended)
This uses almost zero overhead and runs directly on a bare Debian/Ubuntu Linux container templates.

1. **Create the LXC Container**:
   - In your Proxmox VE Web UI, click **Create LXC** (top right).
   - Choose a hostname (e.g., `watchguard-study-portal`).
   - Select a template: **Debian 12** or **Ubuntu 22.04 / 24.04** (Standard templates).
   - **System**: Unprivileged container is fully supported and recommended.
   - **Resource Allocations**:
     - **CPU**: 1 or 2 vCPUs is plenty.
     - **RAM**: 1 GB is generous (runs fine on 512MB).
     - **Disk**: 4 GB is more than enough.
     - **Network**: DHCP or Static IP (bridge to your LAN bridge, e.g., `vmbr0`).
   - Start the container and open the Proxmox Console.

2. **Install Node.js & Git**:
   ```bash
   # Update system repositories
   apt update && apt upgrade -y

   # Install prerequisite packages
   apt install -y curl git build-essential

   # Install Node.js 22.x LTS (using NodeSource)
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
   apt install -y nodejs
   ```

3. **Deploy the Codebase**:
   ```bash
   # Clone the repository
   git clone https://github.com/SpawnMatrix/Watchguard-Studying-App.git /opt/watchguard-study-portal
   cd /opt/watchguard-study-portal

   # Copy and configure the environment variables
   cp .env.example .env

   # Install dependencies
   npm install

   # Build frontend static files & compile the server
   npm run build
   ```

4. **Persist with systemd (Autostart on boot)**:
   Create a system service file so the portal runs continuously in the background and restarts automatically on LXC reboots.
   ```bash
   nano /etc/systemd/system/watchguard-portal.service
   ```
   Paste the following configuration:
   ```ini
   [Unit]
   Description=WatchGuard Training Portal Node Server
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/watchguard-study-portal
   ExecStart=/usr/bin/npm run start
   Restart=on-failure
   Environment=NODE_ENV=production PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start the service:
   ```bash
   systemctl daemon-reload
   systemctl enable watchguard-portal
   systemctl start watchguard-portal
   ```
   Verify that it is active:
   ```bash
   systemctl status watchguard-portal
   ```
   You can now access the interface on `http://<your-lxc-ip>:3000`.

---

### Method B: Docker Compose (Using VM or Docker LXC)
If you already run a general Docker VM or a nested Docker-configured LXC, you can deploy in seconds using the pre-configured `docker-compose.yml`.

1. **Connect to your Docker Host VM** (via SSH).
2. **Download or Clone the files**:
   ```bash
   git clone https://github.com/SpawnMatrix/Watchguard-Studying-App.git
   cd Watchguard-Studying-App
   ```
3. **Configure Environment Variables**:
   Create your local `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   *(Optional)* Open `.env` and configure your settings:
   - To run completely offline and local-only, set `ENABLE_AI_FEATURES=false` (no Gemini API Key required!).
   - To enable advanced tutor commentary, set `ENABLE_AI_FEATURES=true` and insert your `GEMINI_API_KEY`.
4. **Boot Up the Services**:
   ```bash
   docker compose up -d
   ```
5. **Monitor Logs**:
   ```bash
   docker compose logs -f
   ```
   Your container is now running, exposing port `3000`.

---

## ⚙️ Environment Variables

The portal uses standard Node environment variables. Modify `.env` in the root folder to tune behavior:

| Variable | Default | Purpose / Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | The physical port the container or express server listens on. |
| `NODE_ENV` | `production` | Set to `production` or `development`. |
| `ENABLE_AI_FEATURES` | `false` | Toggle to `true` to enable Gemini. By default the app runs in its local-fallback mode and makes no Gemini API calls. |
| `GEMINI_API_KEY` | `""` | Optional. If `ENABLE_AI_FEATURES` is true, paste your free Google Gemini API Key here to enable intelligent exam coaching. |

---

## 🛡️ Reverse Proxy Integration (TLS/SSL)

Learners create a username and six-digit PIN, with server-side progress and a one-time recovery code. Existing browser progress can be imported during registration. Profile display names do not grant administrator access; shared administration controls still require ADMIN_PASSWORD. Reverse-proxy identity is not displayed in the study UI.

For local home labs, we highly recommend setting up an **Nginx Proxy Manager (NPM)** LXC or VM to assign a secure Local SSL certificate (e.g., Let's Encrypt or Wildcard certificate):

1. **Add Proxy Host** in NPM:
   - **Domain Names**: `watchguard-study.yourlocaldomain.lan` (or dynamic DNS domain)
   - **Scheme**: `http`
   - **Forward IP/Hostname**: Insert the IP of your Proxmox LXC/VM running the portal.
   - **Forward Port**: `3000`
2. **Websockets Support**: Ensure you toggle **Websockets Support** to **On** to allow client assets to load cleanly.
3. **SSL**: Request a Let's Encrypt SSL Certificate and force SSL/HTTP2 for secure HTTPS browsing.

---

## 🛠️ Project Development Commands
If you want to modify or compile code locally:

```bash
# Install dependencies
npm install

# Run the development server with Hot Module Replacement
npm run dev

# Compile client frontend assets & bundle the backend Express server
npm run build

# Start the compiled production build
npm run start
```

---

## 🐋 Automated homelab deployment

The production deployment uses `compose.production.yml` and runs the portal on
host port `3001` by default. A systemd timer checks the private GitHub `main`
branch every five minutes. It builds a commit-tagged image, starts it, waits for
the container health check, and rolls back to the previous image if startup
fails.

Deployment files are in `deploy/docker/`. The Docker host needs a read-only
GitHub deploy key and an untracked `.env` file containing at least:

```dotenv
WATCHGUARD_HOST_PORT=3001
ENABLE_AI_FEATURES=false
GEMINI_API_KEY=
ADMIN_PASSWORD=replace-with-a-long-random-value
```

The GitHub Actions workflow also builds and publishes an amd64 image to GHCR
after pushes to `main`. The homelab updater builds from its read-only checkout,
so it does not require a GitHub Packages token and never stores write access to
the repository.
