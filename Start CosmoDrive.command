#!/bin/bash
# ============================================
# ICAN CosmoDrive Launcher
# Double-click to mount NAS & start the app
# ============================================

NAS_IP="192.168.68.142"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
FB_DIR="$HOME/FileBrowser"
NAS_ROOT="$FB_DIR/NAS_Root"

SHARES=(
  "ICAN-MATERIALS"
  "Data"
  "Media"
  "Home.teachers"
  "Home.Chrystal"
  "Home.juneatwork2024"
  "Home.Lem"
  "Home.Celeste"
  "Home.bobie001"
  "Home.Grace"
  "Home.cessjane"
  "Home.Jane"
  "Home.Frenz"
  "Home.TitserKat"
  "Home.Louie061904"
  "Home.admin"
)

echo "========================================="
echo "  ICAN CosmoDrive"
echo "  Cosmic File Explorer"
echo "========================================="
echo ""

# Step 1: Mount NAS shares
echo "[..] Mounting NAS shares..."
for share in "${SHARES[@]}"; do
    if mount | grep -q "$NAS_IP/$share"; then
        echo "  [OK] $share"
    else
        open "smb://$NAS_IP/$share" 2>/dev/null
        echo "  [..] $share"
    fi
done

echo ""
echo "[..] Waiting for mounts..."
sleep 5

MOUNTED=$(mount | grep "$NAS_IP" | wc -l | tr -d ' ')
echo "[OK] $MOUNTED shares mounted"
echo ""

# Step 2: Rebuild symlinks
mkdir -p "$NAS_ROOT/Teachers"
for share in ICAN-MATERIALS Data Media; do
    ln -sf "/Volumes/$share" "$NAS_ROOT/$share" 2>/dev/null
done
for vol in /Volumes/Home.*; do
    name=$(basename "$vol" | sed 's/Home\.//')
    ln -sf "$vol" "$NAS_ROOT/Teachers/$name" 2>/dev/null
done

# Step 3: Kill any existing CosmoDrive instances (don't touch other apps)
lsof -ti :3005 | xargs kill 2>/dev/null
lsof -ti :9090 | xargs kill 2>/dev/null
sleep 1

# Step 4: Start the API server
echo "[..] Starting CosmoDrive API server..."
cd "$APP_DIR"
node server.js &
API_PID=$!
sleep 1

# Step 5: Start the Vite dev server
echo "[..] Starting CosmoDrive frontend..."
npx vite --host 0.0.0.0 --port 9090 &
VITE_PID=$!
sleep 3

# Step 6: Start Cloudflare tunnel (permanent remote access)
if ! pgrep -f "cloudflared tunnel run cosmodrive" > /dev/null 2>&1; then
    echo "[..] Starting Cloudflare tunnel..."
    cloudflared tunnel run cosmodrive &
    TUNNEL_PID=$!
    sleep 2
else
    echo "[OK] Cloudflare Tunnel already running"
    TUNNEL_PID=""
fi

echo ""
echo "========================================="
echo "  CosmoDrive is LIVE!"
echo ""
echo "  Local:   http://localhost:9090"
echo "  Network: http://192.168.68.106:9090"
echo "  Remote:  https://cosmodrive.icanacademy.work"
echo ""
echo "  API:     http://localhost:3005"
echo "========================================="
echo ""

open "http://localhost:9090"

echo "Close this window to stop CosmoDrive."

# Wait for all processes
cleanup() {
    echo ""
    echo "Shutting down CosmoDrive..."
    kill $API_PID $VITE_PID 2>/dev/null
    [ -n "$TUNNEL_PID" ] && kill $TUNNEL_PID 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

wait
