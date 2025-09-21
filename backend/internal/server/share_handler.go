package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/crypto"
	"github.com/rishit911/file_vault_proj-backend/internal/db"
)

// ShareCreateRequest is the expected JSON payload.
type ShareCreateRequest struct {
	FileID       string     `json:"file_id"`
	FolderID     *string    `json:"folder_id,omitempty"`
	Public       *bool      `json:"public,omitempty"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	MaxDownloads *int       `json:"max_downloads,omitempty"`
}

type ShareCreateResponse struct {
	Token     string     `json:"token"`
	URL       string     `json:"url"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// CreateShareHandler returns handler that creates a share row.
func CreateShareHandler(dbConn *sqlx.DB, baseURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Get user ID from context using the typed key
		userIDVal := ctx.Value(userIDKey)
		if userIDVal == nil {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}
		userID, ok := userIDVal.(string)
		if !ok || userID == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		var req ShareCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if req.FileID == "" && req.FolderID == nil {
			http.Error(w, "file_id or folder_id required", http.StatusBadRequest)
			return
		}

		// Validate ownership if file provided
		if req.FileID != "" {
			ownerID, err := db.GetFileOwnerID(ctx, dbConn.DB, req.FileID)
			if err != nil {
				http.Error(w, "file not found", http.StatusNotFound)
				return
			}
			if ownerID != userID {
				http.Error(w, "only uploader can share file", http.StatusForbidden)
				return
			}
		}

		token, err := crypto.GenerateShareToken(18)
		if err != nil {
			http.Error(w, "failed to generate token", http.StatusInternalServerError)
			return
		}

		publicVal := true
		if req.Public != nil {
			publicVal = *req.Public
		}

		share := db.Share{
			FileID:       nil,
			FolderID:     nil,
			OwnerID:      userID,
			Token:        token,
			Public:       publicVal,
			ExpiresAt:    req.ExpiresAt,
			MaxDownloads: req.MaxDownloads,
		}
		if req.FileID != "" {
			share.FileID = &req.FileID
		}
		if req.FolderID != nil {
			share.FolderID = req.FolderID
		}

		created, err := db.CreateShare(ctx, dbConn.DB, share)
		if err != nil {
			http.Error(w, "failed to create share", http.StatusInternalServerError)
			return
		}

		url := strings.TrimRight(baseURL, "/") + "/s/" + created.Token
		resp := ShareCreateResponse{
			Token:     created.Token,
			URL:       url,
			ExpiresAt: created.ExpiresAt,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
