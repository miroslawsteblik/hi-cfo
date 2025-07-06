#!/bin/bash
echo "Rebuilding and restarting containers..."
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d --build
echo "Rebuild complete!"