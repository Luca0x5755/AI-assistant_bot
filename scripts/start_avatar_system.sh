#!/bin/bash
# AVATAR System Startup Script
# Ensures both frontend and backend are running correctly

set -e

echo "🚀 AVATAR System Startup"
echo "========================"

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project root: $PROJECT_ROOT"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to start
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to start..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi

        echo "   Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Check system prerequisites
echo ""
echo "🔍 Checking system prerequisites..."

# Check Python/Poetry
if command -v poetry >/dev/null 2>&1; then
    echo "✅ Poetry found"
else
    echo "❌ Poetry not found - please install Poetry"
    exit 1
fi

# Check Node.js/npm
if command -v npm >/dev/null 2>&1; then
    echo "✅ Node.js/npm found"
else
    echo "❌ Node.js/npm not found - please install Node.js"
    exit 1
fi

# Check if AVATAR backend dependencies are installed
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    echo "⚠️ Python virtual environment not found"
    echo "🔧 Installing dependencies..."
    cd "$PROJECT_ROOT"
    poetry install
fi

# Check if frontend dependencies are installed
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "⚠️ Frontend dependencies not found"
    echo "🔧 Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
fi

echo "✅ Prerequisites check complete"

# Start backend if not running
echo ""
echo "🤖 Starting AVATAR Backend..."

if check_port 8000; then
    echo "✅ Backend already running on port 8000"
else
    echo "🔧 Starting backend server..."
    cd "$PROJECT_ROOT"

    # Start backend in background
    nohup poetry run python src/avatar/main.py > backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"

    # Wait for backend to start
    if wait_for_service "http://localhost:8000/health" "AVATAR Backend"; then
        echo "✅ Backend started successfully"
    else
        echo "❌ Backend failed to start"
        echo "📋 Check backend.log for details"
        exit 1
    fi
fi

# Start frontend if not running
echo ""
echo "🌐 Starting AVATAR Frontend..."

if check_port 8080; then
    echo "✅ Frontend already running on port 8080"
else
    echo "🔧 Starting frontend server..."
    cd "$PROJECT_ROOT/frontend"

    # Start frontend in background
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"

    # Wait for frontend to start
    if wait_for_service "http://localhost:8080/" "AVATAR Frontend"; then
        echo "✅ Frontend started successfully"
    else
        echo "❌ Frontend failed to start"
        echo "📋 Check frontend.log for details"
        exit 1
    fi
fi

# System status summary
echo ""
echo "🎯 AVATAR System Status"
echo "====================="
echo "✅ Backend:  http://localhost:8000/ $(check_port 8000 && echo "(RUNNING)" || echo "(STOPPED)")"
echo "✅ Frontend: http://localhost:8080/ $(check_port 8080 && echo "(RUNNING)" || echo "(STOPPED)")"
echo ""
echo "🌐 Access AVATAR: http://localhost:8080/"
echo "📊 Backend API:   http://localhost:8000/docs"
echo "🏥 Health Check:  http://localhost:8000/health"
echo ""

# Service monitoring reminder
echo "🔧 System Management:"
echo "  • Frontend log: $PROJECT_ROOT/frontend.log"
echo "  • Backend log:  $PROJECT_ROOT/backend.log"
echo "  • Stop all:     pkill -f 'python.*avatar/main.py|npm.*run.*dev'"
echo ""

echo "🎉 AVATAR system startup complete!"
echo "   Frontend and Backend are ready for use."