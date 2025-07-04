package repository

import (
    "database/sql"
    "hi-cfo/server/internal/models"
)

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) Create(user models.CreateUserRequest) (*models.User, error) {
    query := `
        INSERT INTO users (name, email) 
        VALUES ($1, $2) 
        RETURNING id, name, email, created_at`
    
    var newUser models.User
    err := r.db.QueryRow(query, user.Name, user.Email).Scan(
        &newUser.ID, &newUser.Name, &newUser.Email, &newUser.CreatedAt,
    )
    
    if err != nil {
        return nil, err
    }
    
    return &newUser, nil
}

func (r *UserRepository) GetByID(id int) (*models.User, error) {
    query := `SELECT id, name, email, created_at FROM users WHERE id = $1`
    
    var user models.User
    err := r.db.QueryRow(query, id).Scan(
        &user.ID, &user.Name, &user.Email, &user.CreatedAt,
    )
    
    if err != nil {
        return nil, err
    }
    
    return &user, nil
}

func (r *UserRepository) GetAll() ([]models.User, error) {
    query := `SELECT id, name, email, created_at FROM users ORDER BY created_at DESC`
    
    rows, err := r.db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []models.User
    for rows.Next() {
        var user models.User
        err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    
    return users, nil
}

func (r *UserRepository) Update(id int, user models.UpdateUserRequest) (*models.User, error) {
    query := `
        UPDATE users 
        SET name = $1, email = $2 
        WHERE id = $3 
        RETURNING id, name, email, created_at`
    
    var updatedUser models.User
    err := r.db.QueryRow(query, user.Name, user.Email, id).Scan(
        &updatedUser.ID, &updatedUser.Name, &updatedUser.Email, &updatedUser.CreatedAt,
    )
    
    if err != nil {
        return nil, err
    }
    
    return &updatedUser, nil
}

func (r *UserRepository) Delete(id int) error {
    query := `DELETE FROM users WHERE id = $1`
    _, err := r.db.Exec(query, id)
    return err
}