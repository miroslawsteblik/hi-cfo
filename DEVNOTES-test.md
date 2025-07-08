Environment Testing Guide
Prerequisites

Make sure your services are running:

bash

docker-compose up -d
docker-compose ps

1. Basic Service Health Checks
Check Container Status

bash

# View all containers
docker-compose ps

# Check logs for any errors
docker-compose logs nginx
docker-compose logs backend
docker-compose logs frontend
docker-compose logs redis

Test Individual Services

bash

# Test backend directly (bypass nginx)
curl -I http://localhost:8080/health

# Test frontend directly (bypass nginx)
curl -I http://localhost:3000

# Test Redis
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

2. Nginx Proxy Testing
Health Check Endpoint

bash

# Test health check through nginx
curl -v http://localhost/health

# Expected: Should proxy to backend:8080/health

API Endpoints

bash

# Test API routing
curl -v http://localhost/api/health
curl -v http://localhost/api/status

# Test with different HTTP methods
curl -X GET http://localhost/api/test
curl -X POST http://localhost/api/test -H "Content-Type: application/json" -d '{"test": "data"}'

Static Files

bash

# Test static file serving (should go to frontend)
curl -I http://localhost/favicon.ico
curl -I http://localhost/static/css/main.css
curl -I http://localhost/static/js/main.js

# Check cache headers
curl -I http://localhost/logo.png

Frontend Routing

bash

# Test main frontend route
curl -I http://localhost/

# Test SPA routes (should return frontend app)
curl -I http://localhost/dashboard
curl -I http://localhost/profile

3. Rate Limiting Tests
API Rate Limiting

bash

# Test API rate limiting (10 requests per second)
for i in {1..15}; do
  echo "Request $i:"
  curl -w "%{http_code}\n" -s http://localhost/api/test
  sleep 0.1
done

# Expected: First ~10 should return 200, then 429 (Too Many Requests)

Auth Rate Limiting

bash

# Test auth rate limiting (1 request per second)
for i in {1..5}; do
  echo "Auth request $i:"
  curl -w "%{http_code}\n" -s http://localhost/api/auth/login
  sleep 0.5
done

# Expected: Should start returning 429 after first request

4. CORS Testing
Preflight Requests

bash

# Test CORS preflight
curl -X OPTIONS http://localhost/api/test \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Expected: Should return 204 with CORS headers

Cross-Origin Requests

bash

# Test actual CORS request
curl -X POST http://localhost/api/test \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"test": "cors"}' \
  -v

5. WebSocket Testing
Test WebSocket Connection

bash

# Install wscat if not available
npm install -g wscat

# Test WebSocket to backend through nginx
wscat -c ws://localhost/api/ws

# Test WebSocket to frontend
wscat -c ws://localhost/ws

6. Security Headers Testing
Check Security Headers

bash

# Test security headers
curl -I http://localhost/ | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy)"

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin

7. Performance Testing
Test Gzip Compression

bash

# Test gzip compression
curl -H "Accept-Encoding: gzip" -I http://localhost/api/large-data
curl -H "Accept-Encoding: gzip" -I http://localhost/main.css

Load Testing (Optional)

bash

# Install apache bench
sudo apt-get install apache2-utils

# Basic load test
ab -n 100 -c 10 http://localhost/
ab -n 100 -c 10 http://localhost/api/health

8. Redis Testing
Test Redis Connection

bash

# Connect to Redis
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Test basic operations
redis-cli -a ${REDIS_PASSWORD} -h localhost -p 6379 SET test "hello"
redis-cli -a ${REDIS_PASSWORD} -h localhost -p 6379 GET test

Test Redis from Application

bash

# Test if backend can connect to Redis
curl -X POST http://localhost/api/cache/test -d '{"key": "test", "value": "data"}'
curl http://localhost/api/cache/test

9. End-to-End Testing
Complete User Journey

bash

# 1. Load frontend
curl -s http://localhost/ | grep -q "<!DOCTYPE html>"

# 2. Make API call
curl -s http://localhost/api/health | grep -q "ok"

# 3. Test authentication flow
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'

# 4. Test protected route
curl -X GET http://localhost/api/protected \
  -H "Authorization: Bearer YOUR_TOKEN"

10. Error Handling Testing
Test Error Pages

bash

# Test 404 handling
curl -I http://localhost/nonexistent-page

# Test 500 error handling
curl -I http://localhost/api/error-endpoint

Test Service Failures

bash

# Stop backend and test error handling
docker-compose stop backend
curl -I http://localhost/api/health

# Restart backend
docker-compose start backend

11. Browser Testing
Manual Browser Tests

    Open http://localhost in browser
    Check Network tab for:
        Static files loading correctly
        API calls working
        WebSocket connections
        No CORS errors
    Check Console for any JavaScript errors
    Test different routes in your SPA

Test Different Endpoints

    http://localhost/ - Frontend
    http://localhost/health - Health check
    http://localhost/api/ - API endpoints
    http://localhost/api/auth/ - Auth endpoints

Troubleshooting
Common Issues

502 Bad Gateway:

bash

# Check if backend is running
docker-compose ps backend
docker-compose logs backend

CORS Errors:

bash

# Check CORS headers
curl -I -X OPTIONS http://localhost/api/test

Rate Limiting:

bash

# Check nginx error logs
docker-compose logs nginx | grep limit

Static Files Not Loading:

bash

# Check frontend service
docker-compose ps frontend
# Check file permissions
ls -la ./frontend/build/

Debug Commands

bash

# Check nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx config
docker-compose exec nginx nginx -s reload

# Check network connectivity
docker-compose exec nginx ping backend
docker-compose exec nginx ping frontend
docker-compose exec nginx ping redis

Success Criteria

✅ All containers are running (docker-compose ps) ✅ Health checks pass (/health returns 200) ✅ Frontend loads at http://localhost ✅ API endpoints respond at http://localhost/api/* ✅ Static files load with proper caching headers ✅ Rate limiting works (returns 429 when exceeded) ✅ CORS headers are present ✅ Security headers are set ✅ Redis is accessible and authenticated ✅ WebSocket connections work ✅ No errors in container logs


curl -i http://localhost:8088/health