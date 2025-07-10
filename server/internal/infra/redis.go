package infra

import (
	"context"
	"github.com/go-redis/redis/v8"
	"hi-cfo/server/internal/config"
)

// InitializeRedis creates and configures the Redis connection
func InitializeRedis() (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     config.GetRedisAddr(),
		Password: config.GetRedisPassword(),
		DB:       config.GetRedisDB(),
	})

	// Test the connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}
