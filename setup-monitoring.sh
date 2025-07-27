#!/bin/bash

# Hi-CFO Monitoring Setup Script
set -e

echo "🚀 Setting up Hi-CFO Monitoring Stack..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/grafana/{dashboards,datasources}
mkdir -p nginx/ssl
mkdir -p secrets

# Generate basic auth passwords if they don't exist
if [ ! -f secrets/grafana_password.txt ]; then
    echo "🔐 Generating Grafana admin password..."
    openssl rand -base64 32 > secrets/grafana_password.txt
    echo "Grafana admin password saved to secrets/grafana_password.txt"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down -v 2>/dev/null || true

# Build and start the monitoring stack
echo "🏗️ Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."

# Function to wait for a service to be healthy
wait_for_service() {
    local service=$1
    local port=$2
    local path=${3:-"/"}
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port$path" >/dev/null 2>&1; then
            echo "✅ $service is ready!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ $service failed to start after $max_attempts attempts"
            docker-compose logs $service
            exit 1
        fi
        
        echo "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 10
        ((attempt++))
    done
}

# Wait for key services
wait_for_service "nginx_proxy" "8088" "/"
wait_for_service "elasticsearch" "9200" "/_cluster/health"
wait_for_service "grafana" "3001" "/api/health"
wait_for_service "kibana" "5601" "/kibana/api/status"

echo ""
echo "🎉 Hi-CFO Monitoring Stack is ready!"
echo ""
echo "📊 Access your monitoring dashboards:"
echo "   • Main App: http://localhost:8088"
echo "   • Grafana: http://localhost:8088/grafana/ (admin/admin)"
echo "   • Kibana: http://localhost:8088/kibana/"
echo "   • Prometheus: http://localhost:9090"
echo ""
echo "🔧 Direct service access:"
echo "   • Grafana Direct: http://localhost:3001"
echo "   • Kibana Direct: http://localhost:5601"
echo "   • Elasticsearch: http://localhost:9200"
echo ""
echo "📝 Logs: docker-compose logs -f [service_name]"
echo "🛑 Stop: docker-compose down"
echo ""

# Show running containers
echo "🐳 Running containers:"
docker-compose ps