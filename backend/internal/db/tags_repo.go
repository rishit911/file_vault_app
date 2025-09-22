package db

import (
	"context"
	"database/sql"
	"strings"

	"github.com/jmoiron/sqlx"
)

type Tag struct {
	ID   string `db:"id"`
	Name string `db:"name"`
}

// GetAllTags returns all tags in the system
func GetAllTags(ctx context.Context, db *sqlx.DB) ([]Tag, error) {
	var tags []Tag
	err := db.SelectContext(ctx, &tags, "SELECT id, name FROM tags ORDER BY name")
	return tags, err
}

// GetTagByName returns a tag by its name (case-insensitive)
func GetTagByName(ctx context.Context, db *sqlx.DB, name string) (*Tag, error) {
	var tag Tag
	err := db.GetContext(ctx, &tag, "SELECT id, name FROM tags WHERE lower(name) = lower($1)", name)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &tag, err
}

// CreateTag creates a new tag
func CreateTag(ctx context.Context, db *sqlx.DB, name string) (*Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, sql.ErrNoRows
	}

	var tag Tag
	err := db.GetContext(ctx, &tag,
		"INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name",
		name)
	return &tag, err
}

// DeleteTag deletes a tag by name
func DeleteTag(ctx context.Context, db *sqlx.DB, name string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM tags WHERE lower(name) = lower($1)", name)
	return err
}

// GetTagsForFile returns all tags for a specific file
func GetTagsForFile(ctx context.Context, db *sqlx.DB, fileID string) ([]Tag, error) {
	var tags []Tag
	query := `
		SELECT t.id, t.name 
		FROM tags t 
		JOIN file_tags ft ON t.id = ft.tag_id 
		WHERE ft.file_id = $1 
		ORDER BY t.name`
	err := db.SelectContext(ctx, &tags, query, fileID)
	return tags, err
}

// AddTagToFile adds a tag to a file
func AddTagToFile(ctx context.Context, db *sqlx.DB, fileID, tagName string) error {
	// First, ensure the tag exists
	tag, err := GetTagByName(ctx, db, tagName)
	if err != nil {
		return err
	}
	if tag == nil {
		tag, err = CreateTag(ctx, db, tagName)
		if err != nil {
			return err
		}
	}

	// Add the file-tag relationship
	_, err = db.ExecContext(ctx,
		"INSERT INTO file_tags (file_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		fileID, tag.ID)
	return err
}

// RemoveTagFromFile removes a tag from a file
func RemoveTagFromFile(ctx context.Context, db *sqlx.DB, fileID, tagName string) error {
	query := `
		DELETE FROM file_tags 
		WHERE file_id = $1 AND tag_id = (
			SELECT id FROM tags WHERE lower(name) = lower($2)
		)`
	_, err := db.ExecContext(ctx, query, fileID, tagName)
	return err
}

// GetFilesByTag returns files that have a specific tag
func GetFilesByTag(ctx context.Context, db *sqlx.DB, tagName string, limit, offset int) ([]string, int, error) {
	// Get file IDs with upload time for ordering
	type fileResult struct {
		ID         string `db:"id"`
		UploadedAt string `db:"uploaded_at"`
	}

	var results []fileResult
	query := `
		SELECT DISTINCT uf.id, uf.uploaded_at
		FROM user_files uf
		JOIN file_tags ft ON uf.file_object_id = ft.file_id
		JOIN tags t ON ft.tag_id = t.id
		WHERE lower(t.name) = lower($1)
		ORDER BY uf.uploaded_at DESC
		LIMIT $2 OFFSET $3`

	err := db.SelectContext(ctx, &results, query, tagName, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	// Extract just the IDs
	fileIDs := make([]string, len(results))
	for i, result := range results {
		fileIDs[i] = result.ID
	}

	// Get total count
	var totalCount int
	countQuery := `
		SELECT COUNT(DISTINCT uf.id)
		FROM user_files uf
		JOIN file_tags ft ON uf.file_object_id = ft.file_id
		JOIN tags t ON ft.tag_id = t.id
		WHERE lower(t.name) = lower($1)`

	err = db.GetContext(ctx, &totalCount, countQuery, tagName)
	if err != nil {
		return nil, 0, err
	}

	return fileIDs, totalCount, nil
}

// GetFilesWithTags returns files that have any of the specified tags
func GetFilesWithTags(ctx context.Context, db *sqlx.DB, tagNames []string, limit, offset int) ([]string, int, error) {
	if len(tagNames) == 0 {
		return []string{}, 0, nil
	}

	// Create placeholders for the IN clause
	placeholders := make([]string, len(tagNames))
	args := make([]interface{}, len(tagNames)+2)
	for i, tagName := range tagNames {
		placeholders[i] = "$" + string(rune(i+1))
		args[i] = strings.ToLower(tagName)
	}
	args[len(tagNames)] = limit
	args[len(tagNames)+1] = offset

	// Get file IDs
	var fileIDs []string
	query := `
		SELECT DISTINCT uf.id
		FROM user_files uf
		JOIN file_tags ft ON uf.file_object_id = ft.file_id
		JOIN tags t ON ft.tag_id = t.id
		WHERE lower(t.name) IN (` + strings.Join(placeholders, ",") + `)
		ORDER BY uf.uploaded_at DESC
		LIMIT $` + string(rune(len(tagNames)+1)) + ` OFFSET $` + string(rune(len(tagNames)+2))

	err := db.SelectContext(ctx, &fileIDs, query, args...)
	if err != nil {
		return nil, 0, err
	}

	// Get total count
	var totalCount int
	countQuery := `
		SELECT COUNT(DISTINCT uf.id)
		FROM user_files uf
		JOIN file_tags ft ON uf.file_object_id = ft.file_id
		JOIN tags t ON ft.tag_id = t.id
		WHERE lower(t.name) IN (` + strings.Join(placeholders, ",") + `)`

	countArgs := args[:len(tagNames)]
	err = db.GetContext(ctx, &totalCount, countQuery, countArgs...)
	if err != nil {
		return nil, 0, err
	}

	return fileIDs, totalCount, nil
}
