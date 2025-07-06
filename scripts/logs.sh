#!/bin/bash
if [ -z "$1" ]; then
    docker-compose -f docker-compose.dev.yml logs -f
else
    docker-compose -f docker-compose.dev.yml logs -f "$1"
fi