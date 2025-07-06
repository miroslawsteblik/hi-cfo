#!/bin/bash
echo "Starting development environment..."
docker-compose -f docker-compose.dev.yml up -d --build
echo "Development environment started!"
echo "API: http://localhost:8080"
echo "Database Admin: http://localhost:8081"
docker-compose -f docker-compose.dev.yml logs -f api