#!/bin/bash
# AVATAR System Stop Script
# Gracefully stops both frontend and backend services

echo "🛑 AVATAR System Shutdown"
echo "========================="

# Function to stop processes by pattern
stop_service() {
    local pattern=$1
    local service_name=$2

    echo "🔍 Looking for $service_name processes..."

    # Find process IDs matching pattern
    PIDS=$(pgrep -f "$pattern" 2>/dev/null || true)

    if [ -z "$PIDS" ]; then
        echo "✅ No $service_name processes found"
        return 0
    fi

    echo "🔧 Stopping $service_name processes: $PIDS"

    # Send SIGTERM first (graceful shutdown)
    for pid in $PIDS; do
        if kill -TERM "$pid" 2>/dev/null; then
            echo "   Sent SIGTERM to $pid"
        fi
    done

    # Wait for graceful shutdown
    sleep 3

    # Check if processes still running
    for pid in $PIDS; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "   Process $pid still running, sending SIGKILL"
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done

    echo "✅ $service_name stopped"
}

# Stop frontend (npm/vite processes)
stop_service "npm.*run.*dev|vite" "Frontend"

# Stop backend (python avatar processes)
stop_service "python.*avatar/main.py" "Backend"

# Clean up any remaining node processes on port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🔧 Cleaning up port 8080..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
fi

# Clean up any remaining python processes on port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🔧 Cleaning up port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

# Clean up log files if they exist
if [ -f "backend.log" ]; then
    rm -f backend.log
    echo "🗑️ Removed backend.log"
fi

if [ -f "frontend.log" ]; then
    rm -f frontend.log
    echo "🗑️ Removed frontend.log"
fi

echo ""
echo "✅ AVATAR system shutdown complete"
echo "   All services stopped and cleaned up"