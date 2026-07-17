# WatchGuard Certified Network Security Essentials (NSE) Training Portal

A high-performance, responsive self-hosted interactive study companion designed for junior security engineers preparing for the WatchGuard NSE Certification.

This portal features an interactive **Firebox Live Network & Interface Simulator**, a **Practice Quiz Engine** with full-syllabus coverage, **Hands-on Labs** walkthrough guides, and a **Certification Readiness Reports** dashboard. It is designed to be **100% self-hosted, offline-capable**, with optional server-side Gemini AI features.

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

   # Install Node.js 18.x LTS (using NodeSource)
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
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
| `ENABLE_AI_FEATURES` | `true` | Toggle to `false` to disable the Gemini API entirely. The applet automatically switches into a 100% offline, local-fallback mode with zero internet dependencies. |
| `GEMINI_API_KEY` | `""` | Optional. If `ENABLE_AI_FEATURES` is true, paste your free Google Gemini API Key here to enable intelligent exam coaching. |

---

## 🛡️ Reverse Proxy Integration (TLS/SSL)

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
