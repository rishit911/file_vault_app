package server

import (
	"encoding/json"
	"net/http"

	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/storage"
)

type fileMetaReq struct {
	Filename  string `json:"filename"`
	Hash      string `json:"hash"` // client can provide hash; future: compute on upload
	SizeBytes int64  `json:"size_bytes"`
	MimeType  string `json:"mime_type"`
}

func RegisterFileHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req fileMetaReq
		_ = json.NewDecoder(r.Body).Decode(&req)

		if req.Filename == "" || req.Hash == "" {
			http.Error(w, "filename & hash required", http.StatusBadRequest)
			return
		}

		// check existing file_object by hash
		fo, err := storage.FindFileObjectByHash(db, req.Hash)
		if err != nil {
			http.Error(w, "db error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if fo == nil {
			// create file object - for now store storage_path placeholder
			storagePath := "/data/files/" + req.Hash
			fo, err = storage.CreateFileObject(db, req.Hash, storagePath, req.SizeBytes, req.MimeType)
			if err != nil {
				http.Error(w, "create failed", http.StatusInternalServerError)
				return
			}
		} else {
			// increment refcount
			if err := storage.IncrementRefCount(db, fo.ID); err != nil {
				http.Error(w, "inc ref failed", http.StatusInternalServerError)
				return
			}
		}

		// create user_files entry linking to this user - for now we require Authorization header with Bearer token
		// TODO: parse JWT and get userID; for now, accept X-User-Id header (temporary)
		userID := r.Header.Get("X-User-Id")
		if userID == "" {
			http.Error(w, "X-User-Id header required (temp)", http.StatusBadRequest)
			return
		}

		var userFileID string
		err = db.Get(&userFileID, "INSERT INTO user_files (id, user_id, file_object_id, filename) VALUES (gen_random_uuid(), $1,$2,$3) RETURNING id", userID, fo.ID, req.Filename)
		if err != nil {
			http.Error(w, "create user_file failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]string{
			"file_object_id": fo.ID,
			"user_file_id":   userFileID,
		})
	}
}