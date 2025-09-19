package graph

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/rishit911/file_vault_proj-backend/graph/model"
)

// helper to build filter SQL clauses
func buildFilterSQL(f *model.FileFilter, args *[]interface{}) string {
	if f == nil {
		return ""
	}
	parts := []string{}
	idx := len(*args) + 1

	if len(f.MimeTypes) > 0 {
		parts = append(parts, fmt.Sprintf("fo.mime_type = ANY($%d)", idx))
		*args = append(*args, pq.Array(f.MimeTypes))
		idx++
	}
	if f.MinSize != nil {
		parts = append(parts, fmt.Sprintf("fo.size_bytes >= $%d", idx))
		*args = append(*args, *f.MinSize)
		idx++
	}
	if f.MaxSize != nil {
		parts = append(parts, fmt.Sprintf("fo.size_bytes <= $%d", idx))
		*args = append(*args, *f.MaxSize)
		idx++
	}
	if f.FilenameContains != nil && *f.FilenameContains != "" {
		parts = append(parts, fmt.Sprintf("uf.filename ILIKE $%d", idx))
		*args = append(*args, "%"+*f.FilenameContains+"%")
		idx++
	}
	if f.UploaderEmail != nil && *f.UploaderEmail != "" {
		parts = append(parts, fmt.Sprintf("u.email = $%d", idx))
		*args = append(*args, *f.UploaderEmail)
		idx++
	}
	if f.DateFrom != nil {
		parts = append(parts, fmt.Sprintf("uf.uploaded_at >= $%d", idx))
		*args = append(*args, *f.DateFrom)
		idx++
	}
	if f.DateTo != nil {
		parts = append(parts, fmt.Sprintf("uf.uploaded_at <= $%d", idx))
		*args = append(*args, *f.DateTo)
		idx++
	}

	if len(parts) == 0 {
		return ""
	}
	return " AND " + strings.Join(parts, " AND ")
}

func (r *queryResolver) Files(ctx context.Context, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return &model.FilePage{Items: []*model.UserFile{}, TotalCount: 0}, nil
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

	args := []interface{}{userID, limit, offset}

	// base query
	sql := `SELECT
		uf.id AS user_file_id,
		uf.filename,
		uf.uploaded_at,
		fo.id AS file_object_id,
		fo.hash,
		fo.storage_path,
		fo.size_bytes,
		fo.mime_type,
		fo.ref_count
	FROM user_files uf
	JOIN file_objects fo ON uf.file_object_id = fo.id
	WHERE uf.user_id = $1`

	// apply filters
	sql += buildFilterSQL(filter, &args)
	sql += " ORDER BY uf.uploaded_at DESC LIMIT $2 OFFSET $3"

	rows, err := r.DB.Queryx(sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.UserFile
	for rows.Next() {
		var userFileID string
		var filename string
		var uploadedAt time.Time
		var foID, foHash, foStorage string
		var sizeBytes int
		var mimeType *string
		var refCount int

		err := rows.Scan(&userFileID, &filename, &uploadedAt, &foID, &foHash, &foStorage, &sizeBytes, &mimeType, &refCount)
		if err != nil {
			continue
		}

		user := &model.User{ID: userID}
		fo := &model.FileObject{
			ID:          foID,
			Hash:        foHash,
			StoragePath: foStorage,
			SizeBytes:   sizeBytes,
			MimeType:    mimeType,
			RefCount:    refCount,
		}

		uf := &model.UserFile{
			ID:         userFileID,
			User:       user,
			FileObject: fo,
			Filename:   filename,
			Visibility: "private",
			UploadedAt: uploadedAt,
		}

		items = append(items, uf)
	}

	// get total count
	countArgs := []interface{}{userID}
	countSql := `SELECT COUNT(1) FROM user_files uf JOIN file_objects fo ON uf.file_object_id=fo.id WHERE uf.user_id=$1` + buildFilterSQL(filter, &countArgs)
	var total int
	_ = r.DB.Get(&total, countSql, countArgs...)

	return &model.FilePage{Items: items, TotalCount: total}, nil
}

func (r *queryResolver) SearchFiles(ctx context.Context, q string, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	// basic search over filename; reuse Files with filename filter
	searchFilter := &model.FileFilter{
		FilenameContains: &q,
	}
	
	// merge with existing filter if provided
	if filter != nil {
		if filter.MimeTypes != nil {
			searchFilter.MimeTypes = filter.MimeTypes
		}
		if filter.MinSize != nil {
			searchFilter.MinSize = filter.MinSize
		}
		if filter.MaxSize != nil {
			searchFilter.MaxSize = filter.MaxSize
		}
		if filter.DateFrom != nil {
			searchFilter.DateFrom = filter.DateFrom
		}
		if filter.DateTo != nil {
			searchFilter.DateTo = filter.DateTo
		}
		if filter.UploaderEmail != nil {
			searchFilter.UploaderEmail = filter.UploaderEmail
		}
	}

	return r.Files(ctx, searchFilter, pagination)
}

func (r *mutationResolver) RegisterFile(ctx context.Context, input model.RegisterFileInput) (*model.RegisterFilePayload, error) {
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("unauthenticated")
	}

	// dedup check
	var foID string
	err := r.DB.Get(&foID, "SELECT id FROM file_objects WHERE hash=$1", input.Hash)
	if err != nil || foID == "" {
		// create file_object (we'll store storage_path placeholder)
		id := uuid.New().String()
		storagePath := "/data/files/" + input.Hash
		_, err := r.DB.Exec("INSERT INTO file_objects (id, hash, storage_path, size_bytes, mime_type, ref_count) VALUES ($1,$2,$3,$4,$5,1)",
			id, input.Hash, storagePath, input.SizeBytes, input.MimeType)
		if err != nil {
			return nil, err
		}
		foID = id
	} else if err != nil {
		return nil, err
	} else {
		// increment ref
		_, _ = r.DB.Exec("UPDATE file_objects SET ref_count = ref_count + 1 WHERE id=$1", foID)
	}

	// create user_file
	userFileID := uuid.New().String()
	_, err = r.DB.Exec("INSERT INTO user_files (id,user_id,file_object_id,filename) VALUES ($1,$2,$3,$4)",
		userFileID, userID, foID, input.Filename)
	if err != nil {
		return nil, err
	}

	// fetch created rows to return
	var fo model.FileObject
	_ = r.DB.Get(&fo, "SELECT id, hash, storage_path, size_bytes, mime_type, ref_count, created_at FROM file_objects WHERE id=$1", foID)

	var uf model.UserFile
	_ = r.DB.Get(&uf, "SELECT id, filename, uploaded_at FROM user_files WHERE id=$1", userFileID)
	uf.ID = userFileID
	uf.FileObject = &fo
	uf.User = &model.User{ID: userID}

	return &model.RegisterFilePayload{
		FileObject: &fo,
		UserFile:   &uf,
	}, nil
}