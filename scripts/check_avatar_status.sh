#!/bin/bash
# AVATAR System Status Check Script
# Provides comprehensive system health and running status

echo "📊 AVATAR System Status"
echo "======================"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to test service health
test_service_health() {
    local url=$1
    local service_name=$2

    if curl -s "$url" >/dev/null 2>&1; then
        echo "✅ $service_name: HEALTHY"
        return 0
    else
        echo "❌ $service_name: UNHEALTHY"
        return 1
    fi
}

# Check backend status
echo "🤖 Backend Status (Port 8000):"
if check_port 8000; then
    echo "   ✅ Backend port is active"

    # Test backend health
    test_service_health "http://localhost:8000/health" "Backend Health"

    # Check API endpoints
    if curl -s "http://localhost:8000/api/v1/monitoring/health" >/dev/null 2>&1; then
        echo "   ✅ Monitoring API: ACCESSIBLE"
    else
        echo "   ⚠️ Monitoring API: NOT ACCESSIBLE"
    fi

    # Get system info if available
    SYSTEM_INFO=$(curl -s "http://localhost:8000/api/system/info" 2>/dev/null || echo "N/A")
    if [ "$SYSTEM_INFO" != "N/A" ]; then
        echo "   ✅ System API: ACCESSIBLE"
    else
        echo "   ⚠️ System API: NOT ACCESSIBLE"
    fi
else
    echo "   ❌ Backend not running on port 8000"
fi

echo ""

# Check frontend status
echo "🌐 Frontend Status (Port 8080):"
if check_port 8080; then
    echo "   ✅ Frontend port is active"

    # Test frontend health
    if curl -s "http://localhost:8080/" | grep -q "<!doctype html" 2>/dev/null; then
        echo "   ✅ Frontend serving HTML: HEALTHY"
    else
        echo "   ⚠️ Frontend response: UNEXPECTED"
    fi

    # Test specific frontend routes
    if curl -s "http://localhost:8080/test" >/dev/null 2>&1; then
        echo "   ✅ Test page: ACCESSIBLE"
    else
        echo "   ⚠️ Test page: NOT ACCESSIBLE"
    fi
else
    echo "   ❌ Frontend not running on port 8080"
fi

echo ""

# Check process status
echo "🔍 Process Status:"
BACKEND_PROCESSES=$(pgrep -f "python.*avatar/main.py" 2>/dev/null || true)
FRONTEND_PROCESSES=$(pgrep -f "npm.*run.*dev|vite" 2>/dev/null || true)

if [ -n "$BACKEND_PROCESSES" ]; then
    echo "   ✅ Backend processes: $BACKEND_PROCESSES"
else
    echo "   ❌ No backend processes found"
fi

if [ -n "$FRONTEND_PROCESSES" ]; then
    echo "   ✅ Frontend processes: $FRONTEND_PROCESSES"
else
    echo "   ❌ No frontend processes found"
fi

echo ""

# Resource usage
echo "💾 Resource Usage:"
if command -v free >/dev/null 2>&1; then
    MEM_USAGE=$(free -h | awk 'NR==2{printf "RAM: %s/%s (%.1f%%)", $3,$2,$3*100/$2}')
    echo "   $MEM_USAGE"
fi

# GPU status if available
if command -v nvidia-smi >/dev/null 2>&1; then
    GPU_INFO=$(nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
    if [ -n "$GPU_INFO" ]; then
        GPU_UTIL=$(echo $GPU_INFO | cut -d',' -f1)
        VRAM_USED=$(echo $GPU_INFO | cut -d',' -f2)
        VRAM_TOTAL=$(echo $GPU_INFO | cut -d',' -f3)
        VRAM_PERCENT=$((VRAM_USED * 100 / VRAM_TOTAL))
        echo "   GPU: ${GPU_UTIL}% | VRAM: ${VRAM_USED}MB/${VRAM_TOTAL}MB (${VRAM_PERCENT}%)"
    fi
fi

echo ""

# Overall system assessment
echo "🎯 Overall System Assessment:"

BACKEND_OK=$(check_port 8000 && echo "true" || echo "false")
FRONTEND_OK=$(check_port 8080 && echo "true" || echo "false")

if [ "$BACKEND_OK" = "true" ] && [ "$FRONTEND_OK" = "true" ]; then
    echo "   🎉 AVATAR System: FULLY OPERATIONAL"
    echo "   🌐 Access: http://localhost:8080/"
    echo "   📊 API Docs: http://localhost:8000/docs"
elif [ "$FRONTEND_OK" = "true" ]; then
    echo "   ⚠️ AVATAR System: FRONTEND ONLY"
    echo "   🌐 Access: http://localhost:8080/ (limited functionality)"
    echo "   🔧 Start backend: poetry run python src/avatar/main.py"
elif [ "$BACKEND_OK" = "true" ]; then
    echo "   ⚠️ AVATAR System: BACKEND ONLY"
    echo "   📊 API: http://localhost:8000/docs"
    echo "   🔧 Start frontend: cd frontend && npm run dev"
else
    echo "   ❌ AVATAR System: NOT RUNNING"
    echo "   🔧 Start system: ./scripts/start_avatar_system.sh"
fi

echo ""

# Quick actions
echo "🛠️ Quick Actions:"
echo "   Start system:  ./scripts/start_avatar_system.sh"
echo "   Stop system:   ./scripts/stop_avatar_system.sh"
echo "   Check status:  ./scripts/check_avatar_status.sh"
echo "   View logs:     tail -f backend.log frontend.log"