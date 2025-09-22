package server

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/jmoiron/sqlx"
	dbpkg "github.com/rishit911/file_vault_proj-backend/internal/db"
)

func DeleteFileHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Expect path: /api/v1/files/{user_file_id}
		id := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		if id == "" {
			http.Error(w, "file id required", http.StatusBadRequest)
			return
		}

		userID := GetUserIDFromContext(r)
		if userID == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		// fetch owner & file object id
		var ownerID, fileObjectID string
		err := db.Get(&ownerID, "SELECT user_id FROM user_files WHERE id=$1", id)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		if ownerID != userID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		// start tx
		tx, err := db.Beginx()
		if err != nil {
			http.Error(w, "tx error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// get file_object_id and size for quota update
		var fileSize int64
		if err := tx.Get(&fileObjectID, "SELECT file_object_id FROM user_files WHERE id=$1", id); err != nil {
			tx.Rollback()
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		// get file size for storage quota update
		if err := tx.Get(&fileSize, "SELECT size_bytes FROM file_objects WHERE id=$1", fileObjectID); err != nil {
			tx.Rollback()
			http.Error(w, "file size fetch failed", http.StatusInternalServerError)
			return
		}

		// delete the user_files entry
		if _, err := tx.Exec("DELETE FROM user_files WHERE id=$1", id); err != nil {
			tx.Rollback()
			http.Error(w, "delete user_file failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// check current ref_count
		var refCount int
		if err := tx.Get(&refCount, "SELECT ref_count FROM file_objects WHERE id=$1", fileObjectID); err != nil {
			tx.Rollback()
			http.Error(w, "file object not found", http.StatusInternalServerError)
			return
		}

		if refCount > 1 {
			// simply decrement
			if _, err := tx.Exec("UPDATE file_objects SET ref_count = ref_count - 1 WHERE id=$1", fileObjectID); err != nil {
				tx.Rollback()
				http.Error(w, "decrement failed", http.StatusInternalServerError)
				return
			}

			if err := tx.Commit(); err != nil {
				http.Error(w, "commit failed", http.StatusInternalServerError)
				return
			}

			// Update user's storage usage (decrement)
			ctx := r.Context()
			if err := dbpkg.UpdateUserStorageUsedDelta(ctx, db.DB, userID, -fileSize); err != nil {
				// Log error but don't fail the delete since it's already completed
				fmt.Printf("warning: failed to update user storage usage: %v\n", err)
			}

			w.WriteHeader(http.StatusNoContent)
			return
		}

		// ref_count == 1 -> delete file_objects and remove blob
		var storagePath string
		if err := tx.Get(&storagePath, "SELECT storage_path FROM file_objects WHERE id=$1", fileObjectID); err != nil {
			tx.Rollback()
			http.Error(w, "storage path fetch failed", http.StatusInternalServerError)
			return
		}

		if _, err := tx.Exec("DELETE FROM file_objects WHERE id=$1", fileObjectID); err != nil {
			tx.Rollback()
			http.Error(w, "delete file_object failed", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "commit failed", http.StatusInternalServerError)
			return
		}

		// Update user's storage usage (decrement)
		ctx := r.Context()
		if err := dbpkg.UpdateUserStorageUsedDelta(ctx, db.DB, userID, -fileSize); err != nil {
			// Log error but don't fail the delete since it's already completed
			fmt.Printf("warning: failed to update user storage usage: %v\n", err)
		}

		// remove blob from disk but don't fail the API if remove fails
		if storagePath != "" {
			_ = os.Remove(filepath.Clean(storagePath))
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
