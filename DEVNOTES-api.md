TO Register new ap.

/register and /login
1. DEfine Handlers
2. Define Service methods
3. Define Repository Methods - Implement the database operations needed by your service:
4. Define Model Structs
5. Set Up JWT Generation
6. test api

```
# Register a new user
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Test User",
    "last_name":"Test User Surname", 
    "email":"test@example.com",
    "password":"password123"
    }'

# Login with the user
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test2@example.com",
    "password":"password1234"
    }'
```

# Register a new user
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"TestUser2",
    "last_name":"TestUserSurname2", 
    "email":"test2@example.com",
    "password":"password1234"
    }'