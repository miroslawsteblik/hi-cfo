#!/bin/bash
echo "Cleaning up Docker environment..."
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker volume prune -f
echo "Cleanup complete!"