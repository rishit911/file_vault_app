package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
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

		// Parse query parameters for filtering
		args := []interface{}{userID}
		baseQuery := `
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
WHERE uf.user_id = $1`

		// Add filters based on query parameters
		filterSQL := buildRESTFilterSQL(r, &args)
		query := baseQuery + filterSQL + " ORDER BY uf.uploaded_at DESC"

		var items []fileListItem
		if err := db.Select(&items, query, args...); err != nil {
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

// buildRESTFilterSQL builds filter SQL from HTTP query parameters
func buildRESTFilterSQL(r *http.Request, args *[]interface{}) string {
	clauses := []string{}

	// filename contains
	if filename := r.URL.Query().Get("filename"); filename != "" {
		*args = append(*args, "%"+filename+"%")
		clauses = append(clauses, fmt.Sprintf(" AND uf.filename ILIKE $%d", len(*args)))
	}

	// mime types (comma-separated)
	if mimeTypes := r.URL.Query().Get("mime_types"); mimeTypes != "" {
		types := strings.Split(mimeTypes, ",")
		for i := range types {
			types[i] = strings.TrimSpace(types[i])
		}
		*args = append(*args, pq.Array(types))
		clauses = append(clauses, fmt.Sprintf(" AND fo.mime_type = ANY($%d)", len(*args)))
	}

	// size range
	if minSizeStr := r.URL.Query().Get("min_size"); minSizeStr != "" {
		if minSize, err := strconv.Atoi(minSizeStr); err == nil {
			*args = append(*args, minSize)
			clauses = append(clauses, fmt.Sprintf(" AND fo.size_bytes >= $%d", len(*args)))
		}
	}
	if maxSizeStr := r.URL.Query().Get("max_size"); maxSizeStr != "" {
		if maxSize, err := strconv.Atoi(maxSizeStr); err == nil {
			*args = append(*args, maxSize)
			clauses = append(clauses, fmt.Sprintf(" AND fo.size_bytes <= $%d", len(*args)))
		}
	}

	// date range
	if dateFromStr := r.URL.Query().Get("date_from"); dateFromStr != "" {
		if dateFrom, err := time.Parse(time.RFC3339, dateFromStr); err == nil {
			*args = append(*args, dateFrom)
			clauses = append(clauses, fmt.Sprintf(" AND uf.uploaded_at >= $%d", len(*args)))
		}
	}
	if dateToStr := r.URL.Query().Get("date_to"); dateToStr != "" {
		if dateTo, err := time.Parse(time.RFC3339, dateToStr); err == nil {
			*args = append(*args, dateTo)
			clauses = append(clauses, fmt.Sprintf(" AND uf.uploaded_at <= $%d", len(*args)))
		}
	}

	// tags (comma-separated)
	if tagsStr := r.URL.Query().Get("tags"); tagsStr != "" {
		tags := strings.Split(tagsStr, ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
		*args = append(*args, pq.Array(tags))
		clauses = append(clauses, fmt.Sprintf(" AND EXISTS (SELECT 1 FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = fo.id AND t.name = ANY($%d))", len(*args)))
	}

	// uploader email
	if uploaderEmail := r.URL.Query().Get("uploader_email"); uploaderEmail != "" {
		*args = append(*args, "%"+uploaderEmail+"%")
		clauses = append(clauses, fmt.Sprintf(" AND EXISTS (SELECT 1 FROM users u WHERE u.id = uf.user_id AND u.email ILIKE $%d)", len(*args)))
	}

	return strings.Join(clauses, "")
}
