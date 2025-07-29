package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "route", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route"},
	)

	// Financial application specific metrics
	transactionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "financial_transactions_total",
			Help: "Total number of financial transactions processed",
		},
		[]string{"type", "status"},
	)

	transactionAmount = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "financial_transaction_amount",
			Help:    "Amount of financial transactions",
			Buckets: []float64{1, 10, 50, 100, 500, 1000, 5000, 10000, 50000},
		},
		[]string{"type"},
	)

	activeUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "financial_active_users",
			Help: "Number of currently active users",
		},
	)

	accountsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "financial_accounts_total",
			Help: "Total number of accounts in the system",
		},
	)

	// Database metrics
	dbConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Number of active database connections",
		},
	)

	dbQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"operation", "table"},
	)

	// Redis metrics
	redisConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "redis_connections_active",
			Help: "Number of active Redis connections",
		},
	)

	redisOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "redis_operations_total",
			Help: "Total number of Redis operations",
		},
		[]string{"operation", "status"},
	)
)

// PrometheusMiddleware collects HTTP metrics
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())

		httpRequestsTotal.WithLabelValues(
			c.Request.Method,
			c.FullPath(),
			status,
		).Inc()

		httpRequestDuration.WithLabelValues(
			c.Request.Method,
			c.FullPath(),
		).Observe(duration)
	}
}

// Financial metrics functions for use in handlers

// RecordTransaction records a financial transaction metric
func RecordTransaction(transactionType, status string, amount float64) {
	transactionsTotal.WithLabelValues(transactionType, status).Inc()
	transactionAmount.WithLabelValues(transactionType).Observe(amount)
}

// UpdateActiveUsers updates the active users gauge
func UpdateActiveUsers(count float64) {
	activeUsers.Set(count)
}

// UpdateAccountsTotal updates the total accounts gauge
func UpdateAccountsTotal(count float64) {
	accountsTotal.Set(count)
}

// Database metrics functions

// RecordDBQuery records a database query metric
func RecordDBQuery(operation, table string) {
	dbQueriesTotal.WithLabelValues(operation, table).Inc()
}

// UpdateDBConnections updates active database connections
func UpdateDBConnections(count float64) {
	dbConnectionsActive.Set(count)
}

// Redis metrics functions

// RecordRedisOperation records a Redis operation metric
func RecordRedisOperation(operation, status string) {
	redisOperationsTotal.WithLabelValues(operation, status).Inc()
}

// UpdateRedisConnections updates active Redis connections
func UpdateRedisConnections(count float64) {
	redisConnectionsActive.Set(count)
}
