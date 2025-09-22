package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/db"
)

// ServeShareHandler serves GET /s/{token} — streams file and records download.
func ServeShareHandler(dbConn *sqlx.DB, fileBasePath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		// Expect path /s/{token}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if len(parts) < 2 || parts[0] != "s" || parts[1] == "" {
			http.NotFound(w, r)
			return
		}
		token := parts[1]

		share, err := db.GetShareByToken(ctx, dbConn.DB, token)
		if err != nil {
			http.NotFound(w, r)
			return
		}

		// expiry check
		if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
			http.Error(w, "share link expired", http.StatusGone)
			return
		}

		// max downloads check
		if share.MaxDownloads != nil {
			cnt, err := db.CountDownloadsForShare(ctx, dbConn.DB, share.ID)
			if err != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if cnt >= *share.MaxDownloads {
				http.Error(w, "download limit exceeded", http.StatusForbidden)
				return
			}
		}

		if share.FileID == nil && share.FolderID != nil {
			// Folder-level share: return JSON manifest of files (simple approach)
			folderID := *share.FolderID
			// List folder files (use repo ListFolderFiles)
			files, err := db.ListFolderFiles(ctx, dbConn.DB, folderID, 1000, 0)
			if err != nil {
				http.Error(w, "folder not found or error", http.StatusNotFound)
				return
			}
			// Record a download entry for folder share (optional - we'll skip for now)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(files)
			return
		}

		if share.FileID == nil {
			http.Error(w, "shared object is not a file or folder", http.StatusNotImplemented)
			return
		}
		fileID := *share.FileID

		info, err := db.GetFileStreamInfo(ctx, dbConn.DB, fileID)
		if err != nil {
			http.Error(w, "file not found", http.StatusNotFound)
			return
		}

		fp := info.StoragePath
		if !filepath.IsAbs(fp) && fileBasePath != "" {
			fp = filepath.Join(fileBasePath, fp)
		}

		f, err := os.Open(fp)
		if err != nil {
			http.Error(w, "file unavailable", http.StatusNotFound)
			return
		}
		defer f.Close()

		// downloader info (if JWT present)
		var downloaderID *string
		if uid := ctx.Value(userIDKey); uid != nil {
			if s, ok := uid.(string); ok && s != "" {
				downloaderID = &s
			}
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		var ipPtr *string
		if ip != "" {
			ipPtr = &ip
		}
		ua := r.UserAgent()
		var uaPtr *string
		if ua != "" {
			uaPtr = &ua
		}

		// record download (best-effort)
		if err := db.CreateDownloadRecord(ctx, dbConn.DB, &share.ID, fileID, downloaderID, ipPtr, uaPtr); err != nil {
			fmt.Printf("warning: CreateDownloadRecord failed: %v\n", err)
		}

		w.Header().Set("Content-Type", info.MimeType)
		w.Header().Set("Content-Disposition", `attachment; filename="`+info.Filename+`"`)
		w.Header().Set("Content-Length", strconv.FormatInt(info.Size, 10))

		if _, err := io.Copy(w, f); err != nil {
			fmt.Printf("stream error: %v\n", err)
		}
	}
}
