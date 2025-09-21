package db

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
)

// ErrQuotaExceeded indicates the requested upload would exceed user quota.
var ErrQuotaExceeded = errors.New("storage quota exceeded")

// GetUserStorageUsed returns the current storage used by user (cached column).
func GetUserStorageUsed(ctx context.Context, db *sql.DB, userID string) (int64, error) {
	var used sql.NullInt64
	if err := db.QueryRowContext(ctx, `SELECT storage_used_bytes FROM users WHERE id = $1`, userID).Scan(&used); err != nil {
		return 0, err
	}
	if !used.Valid {
		return 0, nil
	}
	return used.Int64, nil
}

// UpdateUserStorageUsedDelta adds delta (can be negative) atomically.
func UpdateUserStorageUsedDelta(ctx context.Context, db *sql.DB, userID string, delta int64) error {
	_, err := db.ExecContext(ctx, `UPDATE users SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2`, delta, userID)
	return err
}

// GetUserQuotaBytes returns configured quota for user. For now, default is env-based and same for all users.
// If you later want per-user quotas, add a column on users table.
func GetUserQuotaBytes() int64 {
	// default 10 MB
	const defaultQuota = 10 * 1024 * 1024
	
	// Read from environment if set
	if quotaStr := os.Getenv("STORAGE_QUOTA_BYTES"); quotaStr != "" {
		if quota, err := strconv.ParseInt(quotaStr, 10, 64); err == nil && quota > 0 {
			return quota
		}
	}
	
	return defaultQuota
}

// CheckStorageQuota checks if adding deltaBytes would exceed the user's quota
func CheckStorageQuota(ctx context.Context, db *sql.DB, userID string, deltaBytes int64) (bool, int64, error) {
	used, err := GetUserStorageUsed(ctx, db, userID)
	if err != nil {
		return false, 0, err
	}
	
	quota := GetUserQuotaBytes()
	if used+deltaBytes > quota {
		return false, used, ErrQuotaExceeded
	}
	
	return true, used, nil
}