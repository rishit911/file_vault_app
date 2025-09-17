package server

import (
	"encoding/json"
	"net/http"

	"github.com/jmoiron/sqlx"
)

type fileListItem struct {
	UserFileID        string `db:"user_file_id" json:"user_file_id"`
	FileObjectID      string `db:"file_object_id" json:"file_object_id"`
	Filename          string `db:"filename" json:"filename"`
	SizeBytes         int64  `db:"size_bytes" json:"size_bytes"`
	MimeType          string `db:"mime_type" json:"mime_type"`
	RefCount          int    `db:"ref_count" json:"ref_count"`
	StoragePath       string `db:"storage_path" json:"storage_path"`
	UploadedAt        string `db:"uploaded_at" json:"uploaded_at"`
	StorageSavedBytes int64  `json:"storage_saved_bytes"`
}

func ListFilesHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserIDFromContext(r)
		if userID == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		var items []fileListItem
		query := `
SELECT
    uf.id AS user_file_id,
    fo.id AS file_object_id,
    uf.filename,
    fo.size_bytes,
    fo.mime_type,
    fo.ref_count,
    fo.storage_path,
    uf.uploaded_at
FROM user_files uf
JOIN file_objects fo ON uf.file_object_id = fo.id
WHERE uf.user_id = $1
ORDER BY uf.uploaded_at DESC`

		if err := db.Select(&items, query, userID); err != nil {
			http.Error(w, "db error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// calculate storage saved per item: size_bytes * (ref_count - 1)
		for i := range items {
			items[i].StorageSavedBytes = items[i].SizeBytes * int64(items[i].RefCount-1)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(items)
	}
}
