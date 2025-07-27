#!/bin/bash

# Quick script to reduce monitoring tool log levels
echo "🔇 Reducing monitoring log levels..."

# Restart services with reduced logging
echo "📊 Restarting monitoring services with reduced logs..."
docker-compose restart prometheus grafana elasticsearch kibana

# Show only essential logs
echo "📝 To view only essential logs, use these commands:"
echo ""
echo "# Application logs only (errors and warnings):"
echo "docker-compose logs -f --tail=50 go_backend nextjs_frontend"
echo ""
echo "# Monitor specific service:"
echo "docker-compose logs -f --tail=20 [service_name]"
echo ""
echo "# View logs since timestamp:"
echo "docker-compose logs --since 30m go_backend"
echo ""
echo "# Filter for errors only:"
echo "docker-compose logs go_backend 2>&1 | grep -i error"

echo ""
echo "✅ Log levels reduced! Monitoring tools will now log less frequently."
echo "💡 Check .env.monitoring file for all available log level settings."