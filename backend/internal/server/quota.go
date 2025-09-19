package server

import (
	"os"
	"strconv"

	"github.com/jmoiron/sqlx"
)

func CheckStorageQuota(db *sqlx.DB, userID string, incomingBytes int64) (bool, int64, error) {
	// default quota from env (bytes)
	quotaStr := os.Getenv("STORAGE_QUOTA_BYTES")
	if quotaStr == "" {
		quotaStr = "10485760" // 10MB
	}
	quota, _ := strconv.ParseInt(quotaStr, 10, 64)

	var used int64
	// calculate deduplicated usage: sum of size_bytes for file_objects referenced by the user (unique file_objects)
	err := db.Get(&used, `
		SELECT COALESCE(SUM(fo.size_bytes),0) 
		FROM file_objects fo
		JOIN user_files uf ON uf.file_object_id = fo.id
		WHERE uf.user_id = $1`, userID)
	if err != nil {
		return false, 0, err
	}

	if used+incomingBytes > quota {
		return false, used, nil
	}

	return true, used, nil
}
