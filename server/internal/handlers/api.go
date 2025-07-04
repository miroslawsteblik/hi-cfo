package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

func HelloHandler(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "message": "Hello from Go!",
    })
}

func GetUsers(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "users": []string{"user1", "user2"},
    })
}

func CreateUser(c *gin.Context) {
    c.JSON(http.StatusCreated, gin.H{
        "message": "User created successfully",
    })
}