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
```


```

- **Purpose**: Define data structures that represent your domain entities
- **Contents**: Your `User` struct, request/response DTOs like `CreateUserRequest`, `UpdateUserRequest`
- **Direction**: Used by all other layers to maintain consistent data structures

## 2. Repository Layer (Data Access)
`user_repo.go`

- **Purpose**: Handles direct database interactions (CRUD operations)
- **Dependencies**: 
  - Requires database connection (`*sql.DB`)
  - Uses models for data structures
- **Methods**: `Create()`, `GetByID()`, `GetAll()`, `Update()`, `Delete()`
- **Direction**: Called by Service layer, never directly by handlers


## 3. Service Layer (Business Logic)
`user_services.go`

- **Purpose**: Contains business logic and orchestrates data flow
- **Dependencies**:
  - Requires repository (`*repository.UserRepository`)
  - Uses models for data structures
- **Methods**: Mirrors repository but adds business logic, validation, etc.
- **Direction**: Called by Handler layer, calls Repository layer


## 4. Handler Layer (HTTP Interface)
`user_handler.go`

- **Purpose**: Handles HTTP requests/responses
- **Dependencies**:
  - Requires service (`*services.UserService`)
  - Uses models for request binding and response formatting
- **Methods**: HTTP handlers like `CreateUser()`, `GetUser()`, `GetAllUsers()`
- **Direction**: Called by Routes layer, calls Service layer


## 5. Routes Layer (API Routing)
`routes.go`

- **Purpose**: Configures HTTP routes and middleware
- **Dependencies**:
  - Initializes all layers (repositories, services, handlers)
  - Uses Gin for routing
- **Methods**: [SetupRoutes()]to configure all routes
- **Direction**: Entry point for HTTP requests


## Dependency Flow Example
Let's trace the flow of a request through your architecture:

1. **HTTP Request** → `GET /api/users/123`
2. **Routes Layer** → Routes the request to [userHandler.GetUser]
3. **Handler Layer** → 
   - Extracts ID from URL parameters
   - Calls [userService.GetUser(id)]
4. **Service Layer** → 
   - Performs any business logic
   - Calls [userRepo.GetByID(id)]
5. **Repository Layer** → 
   - Executes SQL query to database
   - Returns user data to Service layer
6. **Back up the chain** → 
   - Service layer returns data to Handler
   - Handler formats response and returns JSON to client

## Initialization Flow

Your application initializes its components in this sequence:

```go
// From routes.go
userRepo := repository.NewUserRepository(db)       // 1. Create repository with DB
userService := services.NewUserService(userRepo)   // 2. Create service with repo
userHandler := handlers.NewUserHandler(userService)// 3. Create handler with service

// Then register routes with the handler
userRoutes.GET("/users", userHandler.GetAllUsers)  // 4. Register routes
```