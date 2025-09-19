package graph

import (
	"context"
	"fmt"
	"time"

	"github.com/rishit911/file_vault_proj-backend/graph/model"
)

func (r *queryResolver) AdminFiles(ctx context.Context, pagination *model.PaginationInput) (*model.FilePage, error) {
	// Ensure user is admin
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("unauthenticated")
	}

	var role string
	err := r.DB.Get(&role, "SELECT role FROM users WHERE id=$1", userID)
	if err != nil || role != "admin" {
		return nil, fmt.Errorf("forbidden")
	}

	// fetch all user_files with pagination (limit/offset)
	limit := 50
	offset := 0
	if pagination != nil {
		if pagination.Limit != nil {
			limit = int(*pagination.Limit)
		}
		if pagination.Offset != nil {
			offset = int(*pagination.Offset)
		}
	}

	rows, err := r.DB.Queryx(`
		SELECT 
			uf.id as user_file_id, 
			uf.filename, 
			uf.uploaded_at, 
			uf.visibility,
			fo.id as file_object_id, 
			fo.hash, 
			fo.size_bytes, 
			fo.mime_type, 
			fo.ref_count,
			fo.created_at as fo_created_at,
			u.id as user_id, 
			u.email,
			u.role,
			u.created_at as user_created_at
		FROM user_files uf
		JOIN file_objects fo ON uf.file_object_id = fo.id
		JOIN users u ON uf.user_id = u.id
		ORDER BY uf.uploaded_at DESC 
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.UserFile
	for rows.Next() {
		var userFileID, filename, visibility string
		var uploadedAt time.Time
		var foID, foHash string
		var sizeBytes int64
		var mimeType *string
		var refCount int
		var foCreatedAt time.Time
		var uid, email, userRole string
		var userCreatedAt time.Time

		err := rows.Scan(&userFileID, &filename, &uploadedAt, &visibility, &foID, &foHash, &sizeBytes, &mimeType, &refCount, &foCreatedAt, &uid, &email, &userRole, &userCreatedAt)
		if err != nil {
			continue
		}

		user := &model.User{
			ID:        uid,
			Email:     email,
			Role:      userRole,
			CreatedAt: userCreatedAt,
		}

		fo := &model.FileObject{
			ID:          foID,
			Hash:        foHash,
			SizeBytes:   int(sizeBytes),
			MimeType:    mimeType,
			RefCount:    refCount,
			CreatedAt:   foCreatedAt,
		}

		uf := &model.UserFile{
			ID:         userFileID,
			Filename:   filename,
			User:       user,
			FileObject: fo,
			Visibility: visibility,
			UploadedAt: uploadedAt,
		}

		items = append(items, uf)
	}

	var total int
	_ = r.DB.Get(&total, "SELECT COUNT(1) FROM user_files")

	return &model.FilePage{Items: items, TotalCount: total}, nil
}