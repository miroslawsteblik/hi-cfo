package models

import "time"

type User struct {
    ID        int       `json:"id" db:"id"`
    Name      string    `json:"name" db:"name"`
    Email     string    `json:"email" db:"email"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
}

type UpdateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}