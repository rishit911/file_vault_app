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

	// First get total count (simpler query)
	countArgs := []interface{}{userID}
	countSql := `SELECT COUNT(1) FROM user_files uf JOIN file_objects fo ON uf.file_object_id=fo.id WHERE uf.user_id=$1` + buildFilterSQL(filter, &countArgs)
	var total int
	err := r.DB.Get(&total, countSql, countArgs...)
	if err != nil {
		return nil, fmt.Errorf("count query failed: %v", err)
	}

	// If no files, return empty result
	if total == 0 {
		return &model.FilePage{Items: []*model.UserFile{}, TotalCount: 0}, nil
	}

	// Build main query with proper parameter indexing
	args := []interface{}{userID}
	sql := `SELECT
		uf.id,
		uf.filename,
		uf.uploaded_at,
		uf.visibility,
		fo.id,
		fo.hash,
		fo.storage_path,
		fo.size_bytes,
		fo.mime_type,
		fo.ref_count,
		fo.created_at
	FROM user_files uf
	JOIN file_objects fo ON uf.file_object_id = fo.id
	WHERE uf.user_id = $1`

	// Apply filters
	sql += buildFilterSQL(filter, &args)
	
	// Add pagination
	sql += fmt.Sprintf(" ORDER BY uf.uploaded_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.DB.Queryx(sql, args...)
	if err != nil {
		return nil, fmt.Errorf("main query failed: %v", err)
	}
	defer rows.Close()

	var items []*model.UserFile
	for rows.Next() {
		var uf struct {
			ID         string     `db:"id"`
			Filename   string     `db:"filename"`
			UploadedAt time.Time  `db:"uploaded_at"`
			Visibility string     `db:"visibility"`
		}
		var fo struct {
			ID          string     `db:"id"`
			Hash        string     `db:"hash"`
			StoragePath string     `db:"storage_path"`
			SizeBytes   int64      `db:"size_bytes"`
			MimeType    *string    `db:"mime_type"`
			RefCount    int        `db:"ref_count"`
			CreatedAt   time.Time  `db:"created_at"`
		}

		err := rows.Scan(
			&uf.ID, &uf.Filename, &uf.UploadedAt, &uf.Visibility,
			&fo.ID, &fo.Hash, &fo.StoragePath, &fo.SizeBytes, &fo.MimeType, &fo.RefCount, &fo.CreatedAt,
		)
		if err != nil {
			continue
		}

		userFile := &model.UserFile{
			ID:         uf.ID,
			User:       &model.User{ID: userID},
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
		}

		items = append(items, userFile)
	}

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
			return nil, fmt.Errorf("failed to create file object: %v", err)
		}
		foID = id
	} else {
		// increment ref
		_, err = r.DB.Exec("UPDATE file_objects SET ref_count = ref_count + 1 WHERE id=$1", foID)
		if err != nil {
			return nil, fmt.Errorf("failed to increment ref count: %v", err)
		}
	}

	// create user_file
	userFileID := uuid.New().String()
	_, err = r.DB.Exec("INSERT INTO user_files (id, user_id, file_object_id, filename) VALUES ($1,$2,$3,$4)",
		userFileID, userID, foID, input.Filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create user file: %v", err)
	}

	// fetch created rows to return
	var fo struct {
		ID          string    `db:"id"`
		Hash        string    `db:"hash"`
		StoragePath string    `db:"storage_path"`
		SizeBytes   int64     `db:"size_bytes"`
		MimeType    *string   `db:"mime_type"`
		RefCount    int       `db:"ref_count"`
		CreatedAt   time.Time `db:"created_at"`
	}
	err = r.DB.Get(&fo, "SELECT id, hash, storage_path, size_bytes, mime_type, ref_count, created_at FROM file_objects WHERE id=$1", foID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch file object: %v", err)
	}

	var uf struct {
		ID         string    `db:"id"`
		Filename   string    `db:"filename"`
		UploadedAt time.Time `db:"uploaded_at"`
		Visibility string    `db:"visibility"`
	}
	err = r.DB.Get(&uf, "SELECT id, filename, uploaded_at, visibility FROM user_files WHERE id=$1", userFileID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user file: %v", err)
	}

	return &model.RegisterFilePayload{
		FileObject: &model.FileObject{
			ID:          fo.ID,
			Hash:        fo.Hash,
			StoragePath: fo.StoragePath,
			SizeBytes:   int(fo.SizeBytes),
			MimeType:    fo.MimeType,
			RefCount:    fo.RefCount,
			CreatedAt:   fo.CreatedAt,
		},
		UserFile: &model.UserFile{
			ID:         uf.ID,
			User:       &model.User{ID: userID},
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
		},
	}, nil
}