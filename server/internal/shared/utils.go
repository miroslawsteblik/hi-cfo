package shared

import (
	"fmt"
	"time"
)

// ParseFlexibleDate parses date strings in multiple formats
// Commonly used formats for API date inputs
func ParseFlexibleDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("empty date string")
	}

	// Try different date formats in order of preference
	formats := []string{
		"2006-01-02",           // Date only: 2024-01-15
		"2006-01-02T15:04:05Z", // ISO format: 2024-01-15T10:30:00Z
		"2006-01-02T15:04:05",  // ISO without timezone: 2024-01-15T10:30:00
		time.RFC3339,           // Full RFC3339: 2024-01-15T10:30:00Z07:00
		time.RFC3339Nano,       // RFC3339 with nanoseconds
		"01/02/2006",           // US format: 01/15/2024
		"2006/01/02",           // Alternative format: 2024/01/15
		"02-01-2006",           // EU format: 15-01-2024
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s (supported formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SSZ)", dateStr)
}

// ParseFlexibleDatePointer parses date string and returns pointer
// Returns nil for empty strings, useful for optional date fields
func ParseFlexibleDatePointer(dateStr string) (*time.Time, error) {
	if dateStr == "" {
		return nil, nil
	}

	t, err := ParseFlexibleDate(dateStr)
	if err != nil {
		return nil, err
	}

	return &t, nil
}

// FormatDate formats time to standard API date format
func FormatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

// FormatDateTime formats time to standard API datetime format
func FormatDateTime(t time.Time) string {
	return t.Format(time.RFC3339)
}
