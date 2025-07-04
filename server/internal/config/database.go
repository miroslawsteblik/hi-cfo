package config


import (
    "database/sql"
    "fmt"
    "log"
    "os"
    
    _ "github.com/lib/pq"
)

type Database struct {
    DB *sql.DB
}

func NewDatabase() *Database {
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbName := os.Getenv("DB_NAME")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")
    
    dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        dbHost, dbPort, dbUser, dbPassword, dbName)
    
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    
    if err := db.Ping(); err != nil {
        log.Fatal("Failed to ping database:", err)
    }
    
    log.Println("Database connected successfully")
    return &Database{DB: db}
}

func (d *Database) Close() error {
    return d.DB.Close()
}