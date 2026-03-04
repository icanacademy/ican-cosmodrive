#!/bin/bash
# CosmoDrive — starts server + vite + Cloudflare tunnel

cd "$(dirname "$0")"

cleanup() {
  echo ""
  echo "Shutting down CosmoDrive..."
  kill $SERVER_PID $VITE_PID $TUNNEL_PID 2>/dev/null
  wait $SERVER_PID $VITE_PID $TUNNEL_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo "=================================================="
echo "  ICAN CosmoDrive"
echo "=================================================="
echo ""

# Start Express API server
node server.js &
SERVER_PID=$!

# Start Vite dev server
npx vite &
VITE_PID=$!

# Wait for Vite to be ready
sleep 3

# Start Cloudflare tunnel (permanent)
cloudflared tunnel run cosmodrive &
TUNNEL_PID=$!

echo ""
echo "=================================================="
echo "  CosmoDrive is LIVE!"
echo ""
echo "  Local:   http://localhost:9090"
echo "  Remote:  https://cosmodrive.icanacademy.work"
echo ""
echo "  Share the remote URL with teachers!"
echo "  This URL is permanent — never changes."
echo "=================================================="
echo ""

wait
