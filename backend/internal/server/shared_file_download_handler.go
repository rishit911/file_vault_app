package server

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/db"
)

func SharedFileDownloadHandler(dbConn *sqlx.DB, fileBasePath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("SharedFileDownloadHandler: Request received - Method: %s, Path: %s", r.Method, r.URL.Path)

		// Get user ID from context (set by auth middleware)
		userID, ok := r.Context().Value(UserIDKey).(string)
		if !ok {
			log.Printf("SharedFileDownloadHandler: No user ID in context")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		log.Printf("SharedFileDownloadHandler: User ID: %s", userID)

		// Get share ID from URL path
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/shared-files/")
		shareIDStr := strings.TrimSuffix(path, "/download")
		log.Printf("SharedFileDownloadHandler: Extracted share ID string: '%s'", shareIDStr)

		shareID, err := uuid.Parse(shareIDStr)
		if err != nil {
			log.Printf("SharedFileDownloadHandler: Invalid share ID: %s, error: %v", shareIDStr, err)
			http.Error(w, "Invalid share ID", http.StatusBadRequest)
			return
		}
		log.Printf("SharedFileDownloadHandler: Parsed share ID: %s", shareID)

		currentUserID, err := uuid.Parse(userID)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Get the user share and verify access
		userShare, err := db.GetUserShareByID(shareID, currentUserID)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Share not found or access denied", http.StatusNotFound)
			} else {
				http.Error(w, "Database error", http.StatusInternalServerError)
			}
			return
		}

		// Get file details
		fileObject, err := db.GetFileObjectByID(userShare.FileID)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		// Get the original filename from user_files
		userFile, err := db.GetUserFileByFileObjectID(userShare.FileID, userShare.OwnerID)
		if err != nil {
			http.Error(w, "File details not found", http.StatusNotFound)
			return
		}

		// Construct file path
		filePath := filepath.Join(fileBasePath, fileObject.StoragePath)

		// Check if file exists
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			http.Error(w, "File not found on disk", http.StatusNotFound)
			return
		}

		// Open file
		file, err := os.Open(filePath)
		if err != nil {
			http.Error(w, "Cannot open file", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		// Set headers for download
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", userFile.Filename))
		w.Header().Set("Content-Type", "application/octet-stream")
		if fileObject.MimeType != nil {
			w.Header().Set("Content-Type", *fileObject.MimeType)
		}

		// Stream file to response
		http.ServeFile(w, r, filePath)
	}
}
