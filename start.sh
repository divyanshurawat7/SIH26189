#!/bin/bash
# ==============================================================================
# SIH26189 — One-Click Project Launcher
# Starts both FastAPI backend and React/Vite frontend, opens the browser,
# and cleans up cleanly on Ctrl+C.
# ==============================================================================

echo "=================================================="
echo " Starting SIH26189 Criminal Intelligence Platform "
echo "=================================================="

# Kill any stale processes on ports 8000 or 5173
if lsof -i :8000 > /dev/null 2>&1; then
    echo "[!] Port 8000 is in use. Cleaning up previous backend process..."
    kill -9 $(lsof -t -i :8000) 2>/dev/null
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "[!] Port 5173 is in use. Cleaning up previous frontend process..."
    kill -9 $(lsof -t -i :5173) 2>/dev/null
fi

# Clean shutdown handler on Ctrl+C
trap 'echo -e "\n[!] Shutting down all services..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM EXIT

echo "[1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000..."
python3 -m uvicorn src.api:app --host 127.0.0.1 --port 8000 &

echo "[2/2] Starting React Vite Frontend on http://localhost:5173..."
npm run dev --prefix frontend &

# Wait for backend readiness
echo "Waiting for intelligence engine to initialize..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "[✓] Backend is ready at http://127.0.0.1:8000"
        break
    fi
    sleep 1
done

# Open Chrome or default browser
if command -v open > /dev/null 2>&1; then
    open -a "Google Chrome" "http://localhost:5173" 2>/dev/null || open "http://localhost:5173"
fi

echo "=================================================="
echo " Project is LIVE:"
echo "   Dashboard: http://localhost:5173"
echo "   API Docs:  http://127.0.0.1:8000/docs"
echo "   Press Ctrl+C to stop all servers."
echo "=================================================="

wait
