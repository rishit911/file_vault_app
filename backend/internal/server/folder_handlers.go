package server

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/rishit911/file_vault_proj-backend/internal/db"
)

// CreateFolderRequest ...
type CreateFolderRequest struct {
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id,omitempty"`
}

// CreateFolderHandler func
func CreateFolderHandler(dbConn *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userIDVal := ctx.Value(userIDKey) // adapt to your auth context
		if userIDVal == nil {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}
		userID := userIDVal.(string)

		var req CreateFolderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		f := db.Folder{
			Name:     req.Name,
			OwnerID:  userID,
			ParentID: req.ParentID,
		}
		created, err := db.CreateFolder(ctx, dbConn, f)
		if err != nil {
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(created)
	}
}

// ListFolderContentsHandler func
func ListFolderContentsHandler(dbConn *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		fid := q.Get("folder_id")
		limit := 50
		offset := 0
		if l := q.Get("limit"); l != "" {
			if v, err := strconv.Atoi(l); err == nil {
				limit = v
			}
		}
		if o := q.Get("offset"); o != "" {
			if v, err := strconv.Atoi(o); err == nil {
				offset = v
			}
		}
		files, err := db.ListFolderFiles(r.Context(), dbConn, fid, limit, offset)
		if err != nil {
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(files)
	}
}
