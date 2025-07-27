package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

var DefaultLogger *logrus.Logger

// InitLogger initializes the global logger
func InitLogger(env string) *logrus.Logger {
	logger := logrus.New()

	if env == "production" {
		// Production: JSON format, Info level
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05Z07:00",
		})
		logger.SetLevel(logrus.InfoLevel)
		logger.SetOutput(os.Stdout)
	} else {
		// Development: Text format, Debug level
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "15:04:05",
			ForceColors:     true,
		})
		logger.SetLevel(logrus.DebugLevel)
		logger.SetOutput(os.Stdout)
	}

	// Set as default logger
	DefaultLogger = logger
	return logger
}

// WithFields creates a new logger entry with fields
func WithFields(fields logrus.Fields) *logrus.Entry {
	return DefaultLogger.WithFields(fields)
}

// WithField creates a new logger entry with a single field
func WithField(key string, value interface{}) *logrus.Entry {
	return DefaultLogger.WithField(key, value)
}

// Domain-specific logger helpers
func WithDomain(domain string) *logrus.Entry {
	return DefaultLogger.WithField("domain", domain)
}

func WithService(service string) *logrus.Entry {
	return DefaultLogger.WithField("service", service)
}

func WithUserID(userID string) *logrus.Entry {
	return DefaultLogger.WithField("user_id", userID)
}

func WithRequestID(requestID string) *logrus.Entry {
	return DefaultLogger.WithField("request_id", requestID)
}

// Convenience methods
func Debug(args ...interface{}) {
	DefaultLogger.Debug(args...)
}

func Info(args ...interface{}) {
	DefaultLogger.Info(args...)
}

func Warn(args ...interface{}) {
	DefaultLogger.Warn(args...)
}

func Error(args ...interface{}) {
	DefaultLogger.Error(args...)
}

func Fatal(args ...interface{}) {
	DefaultLogger.Fatal(args...)
}

func Debugf(format string, args ...interface{}) {
	DefaultLogger.Debugf(format, args...)
}

func Infof(format string, args ...interface{}) {
	DefaultLogger.Infof(format, args...)
}

func Warnf(format string, args ...interface{}) {
	DefaultLogger.Warnf(format, args...)
}

func Errorf(format string, args ...interface{}) {
	DefaultLogger.Errorf(format, args...)
}

func Fatalf(format string, args ...interface{}) {
	DefaultLogger.Fatalf(format, args...)
}
