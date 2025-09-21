package graph

import (
	"fmt"
	"strings"

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
	
	// tags: check any tag matches (EXISTS with t.name = ANY($N))
	if f.Tags != nil && len(f.Tags) > 0 {
		parts = append(parts, fmt.Sprintf("EXISTS (SELECT 1 FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = fo.id AND t.name = ANY($%d))", idx))
		*args = append(*args, pq.Array(f.Tags))
		idx++
	}

	if len(parts) == 0 {
		return ""
	}
	return " AND " + strings.Join(parts, " AND ")
}
