TO Register new ap.

/register and /login
1. DEfine Handlers
2. Define Service methods
3. Define Repository Methods - Implement the database operations needed by your service:
4. Define Model Structs
5. Set Up JWT Generation
6. test api



# Login with the user
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test2@example.com",
    "password":"password1234"
    }'


# Register a new user
curl -X POST http://localhost:8088/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"TestUser8",
    "last_name":"TestUserSurname8",
    "email":"test8@example.com",
    "password":"password1234"
    }'


# Test from your host machine
curl -X POST http://localhost:8088/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "first_name":"TestUser7",
    "last_name":"TestUserSurname7",
    "email":"test7@example.com",
    "password":"password1234"
    }' \
  -v