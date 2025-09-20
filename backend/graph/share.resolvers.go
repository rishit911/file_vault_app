package graph

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rishit911/file_vault_proj-backend/graph/model"
)

// CreateShare creates a new share for a user file
func (r *mutationResolver) CreateShare(ctx context.Context, input model.CreateShareInput) (*model.Share, error) {
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("unauthenticated")
	}

	// Verify user owns the file
	var fileOwnerID string
	err := r.DB.Get(&fileOwnerID, "SELECT user_id FROM user_files WHERE id=$1", input.UserFileID)
	if err != nil {
		return nil, fmt.Errorf("file not found")
	}
	if fileOwnerID != userID {
		return nil, fmt.Errorf("forbidden: you don't own this file")
	}

	// Generate a unique public link
	linkBytes := make([]byte, 16)
	_, err = rand.Read(linkBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to generate public link")
	}
	publicLink := hex.EncodeToString(linkBytes)

	// Create the share
	shareID := uuid.New().String()
	_, err = r.DB.Exec(`
		INSERT INTO shares (id, user_file_id, public_link, expires_at, download_count, created_at) 
		VALUES ($1, $2, $3, $4, 0, now())`,
		shareID, input.UserFileID, publicLink, input.ExpiresAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create share: %v", err)
	}

	// Fetch the created share with user file details
	var share struct {
		ID           string     `db:"id"`
		PublicLink   string     `db:"public_link"`
		ExpiresAt    *time.Time `db:"expires_at"`
		DownloadCount int       `db:"download_count"`
		CreatedAt    time.Time  `db:"created_at"`
	}
	err = r.DB.Get(&share, `
		SELECT id, public_link, expires_at, download_count, created_at 
		FROM shares WHERE id=$1`, shareID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch created share: %v", err)
	}

	// Get user file details
	userFile, err := r.getUserFileByID(ctx, input.UserFileID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user file: %v", err)
	}

	isExpired := false
	if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
		isExpired = true
	}

	return &model.Share{
		ID:            share.ID,
		UserFile:      userFile,
		PublicLink:    share.PublicLink,
		ExpiresAt:     share.ExpiresAt,
		DownloadCount: share.DownloadCount,
		CreatedAt:     share.CreatedAt,
		IsExpired:     isExpired,
	}, nil
}

// DeleteShare deletes a share
func (r *mutationResolver) DeleteShare(ctx context.Context, shareID string) (*model.DeletePayload, error) {
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("unauthenticated")
	}

	// Verify user owns the file that's being shared
	var fileOwnerID string
	err := r.DB.Get(&fileOwnerID, `
		SELECT uf.user_id 
		FROM shares s 
		JOIN user_files uf ON s.user_file_id = uf.id 
		WHERE s.id=$1`, shareID)
	if err != nil {
		return nil, fmt.Errorf("share not found")
	}
	if fileOwnerID != userID {
		return nil, fmt.Errorf("forbidden: you don't own this share")
	}

	// Delete the share
	_, err = r.DB.Exec("DELETE FROM shares WHERE id=$1", shareID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete share: %v", err)
	}

	return &model.DeletePayload{Success: true}, nil
}

// Share gets a share by public link (for public access)
func (r *queryResolver) Share(ctx context.Context, publicLink string) (*model.Share, error) {
	var share struct {
		ID           string     `db:"id"`
		UserFileID   string     `db:"user_file_id"`
		PublicLink   string     `db:"public_link"`
		ExpiresAt    *time.Time `db:"expires_at"`
		DownloadCount int       `db:"download_count"`
		CreatedAt    time.Time  `db:"created_at"`
	}

	err := r.DB.Get(&share, `
		SELECT id, user_file_id, public_link, expires_at, download_count, created_at 
		FROM shares WHERE public_link=$1`, publicLink)
	if err != nil {
		return nil, fmt.Errorf("share not found")
	}

	// Check if expired
	isExpired := false
	if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
		isExpired = true
	}

	// Get user file details
	userFile, err := r.getUserFileByID(ctx, share.UserFileID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user file: %v", err)
	}

	return &model.Share{
		ID:            share.ID,
		UserFile:      userFile,
		PublicLink:    share.PublicLink,
		ExpiresAt:     share.ExpiresAt,
		DownloadCount: share.DownloadCount,
		CreatedAt:     share.CreatedAt,
		IsExpired:     isExpired,
	}, nil
}

// MyShares gets all shares created by the current user
func (r *queryResolver) MyShares(ctx context.Context, pagination *model.PaginationInput) (*model.SharePage, error) {
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("unauthenticated")
	}

	limit := 20
	offset := 0
	if pagination != nil {
		if pagination.Limit != nil {
			limit = int(*pagination.Limit)
		}
		if pagination.Offset != nil {
			offset = int(*pagination.Offset)
		}
	}

	// Get total count
	var total int
	err := r.DB.Get(&total, `
		SELECT COUNT(1) 
		FROM shares s 
		JOIN user_files uf ON s.user_file_id = uf.id 
		WHERE uf.user_id=$1`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count shares: %v", err)
	}

	// Get shares with pagination
	rows, err := r.DB.Queryx(`
		SELECT s.id, s.user_file_id, s.public_link, s.expires_at, s.download_count, s.created_at
		FROM shares s 
		JOIN user_files uf ON s.user_file_id = uf.id 
		WHERE uf.user_id=$1 
		ORDER BY s.created_at DESC 
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch shares: %v", err)
	}
	defer rows.Close()

	var items []*model.Share
	for rows.Next() {
		var share struct {
			ID           string     `db:"id"`
			UserFileID   string     `db:"user_file_id"`
			PublicLink   string     `db:"public_link"`
			ExpiresAt    *time.Time `db:"expires_at"`
			DownloadCount int       `db:"download_count"`
			CreatedAt    time.Time  `db:"created_at"`
		}

		err := rows.StructScan(&share)
		if err != nil {
			continue
		}

		// Get user file details
		userFile, err := r.getUserFileByID(ctx, share.UserFileID)
		if err != nil {
			continue
		}

		isExpired := false
		if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
			isExpired = true
		}

		items = append(items, &model.Share{
			ID:            share.ID,
			UserFile:      userFile,
			PublicLink:    share.PublicLink,
			ExpiresAt:     share.ExpiresAt,
			DownloadCount: share.DownloadCount,
			CreatedAt:     share.CreatedAt,
			IsExpired:     isExpired,
		})
	}

	return &model.SharePage{Items: items, TotalCount: total}, nil
}

// Shares resolver for UserFile.shares field
func (r *userFileResolver) Shares(ctx context.Context, obj *model.UserFile) ([]*model.Share, error) {
	rows, err := r.DB.Queryx(`
		SELECT id, public_link, expires_at, download_count, created_at
		FROM shares WHERE user_file_id=$1 
		ORDER BY created_at DESC`, obj.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch shares: %v", err)
	}
	defer rows.Close()

	var shares []*model.Share
	for rows.Next() {
		var share struct {
			ID           string     `db:"id"`
			PublicLink   string     `db:"public_link"`
			ExpiresAt    *time.Time `db:"expires_at"`
			DownloadCount int       `db:"download_count"`
			CreatedAt    time.Time  `db:"created_at"`
		}

		err := rows.StructScan(&share)
		if err != nil {
			continue
		}

		isExpired := false
		if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
			isExpired = true
		}

		shares = append(shares, &model.Share{
			ID:            share.ID,
			UserFile:      obj,
			PublicLink:    share.PublicLink,
			ExpiresAt:     share.ExpiresAt,
			DownloadCount: share.DownloadCount,
			CreatedAt:     share.CreatedAt,
			IsExpired:     isExpired,
		})
	}

	return shares, nil
}

// Helper function to get user file by ID
func (r *Resolver) getUserFileByID(ctx context.Context, userFileID string) (*model.UserFile, error) {
	var uf struct {
		ID         string    `db:"id"`
		UserID     string    `db:"user_id"`
		Filename   string    `db:"filename"`
		Visibility string    `db:"visibility"`
		UploadedAt time.Time `db:"uploaded_at"`
	}
	var fo struct {
		ID          string    `db:"id"`
		Hash        string    `db:"hash"`
		StoragePath string    `db:"storage_path"`
		SizeBytes   int64     `db:"size_bytes"`
		MimeType    *string   `db:"mime_type"`
		RefCount    int       `db:"ref_count"`
		CreatedAt   time.Time `db:"created_at"`
	}
	var user struct {
		ID        string    `db:"id"`
		Email     string    `db:"email"`
		Role      string    `db:"role"`
		CreatedAt time.Time `db:"created_at"`
	}

	err := r.DB.QueryRowx(`
		SELECT 
			uf.id, uf.user_id, uf.filename, uf.visibility, uf.uploaded_at,
			fo.id, fo.hash, fo.storage_path, fo.size_bytes, fo.mime_type, fo.ref_count, fo.created_at,
			u.id, u.email, u.role, u.created_at
		FROM user_files uf
		JOIN file_objects fo ON uf.file_object_id = fo.id
		JOIN users u ON uf.user_id = u.id
		WHERE uf.id=$1`, userFileID).Scan(
		&uf.ID, &uf.UserID, &uf.Filename, &uf.Visibility, &uf.UploadedAt,
		&fo.ID, &fo.Hash, &fo.StoragePath, &fo.SizeBytes, &fo.MimeType, &fo.RefCount, &fo.CreatedAt,
		&user.ID, &user.Email, &user.Role, &user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &model.UserFile{
		ID: uf.ID,
		User: &model.User{
			ID:        user.ID,
			Email:     user.Email,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
		},
		FileObject: &model.FileObject{
			ID:          fo.ID,
			Hash:        fo.Hash,
			StoragePath: fo.StoragePath,
			SizeBytes:   int(fo.SizeBytes),
			MimeType:    fo.MimeType,
			RefCount:    fo.RefCount,
			CreatedAt:   fo.CreatedAt,
		},
		Filename:   uf.Filename,
		Visibility: uf.Visibility,
		UploadedAt: uf.UploadedAt,
	}, nil
}