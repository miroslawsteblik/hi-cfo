package cache

import (
	"context"
	"fmt"
	"hi-cfo/server/internal/config"
	"time"

	"github.com/go-redis/redis/v8"
)

// InitializeRedis creates and configures the Redis connection
func InitializeRedis() (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     config.GetRedisAddr(),
		Password: config.GetRedisPassword(),
		DB:       config.GetRedisDB(),
	})

	// Test the connection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", config.GetRedisAddr(), err)
	}

	return client, nil
}
