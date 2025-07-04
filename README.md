Browser Request: http://localhost:3000/api/hello
      ↓
Next.js Server (Port 3000) - receives request
      ↓
next.config.ts rewrites /api/* to http://localhost:8080/api/*
      ↓
Go Server (Port 8080) - processes API request
      ↓
Response flows back to browser
f