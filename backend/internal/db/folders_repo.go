package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type Folder struct {
	ID        string
	Name      string
	OwnerID   string
	ParentID  *string
	CreatedAt time.Time
}

// CreateFolder inserts a folder and returns it
func CreateFolder(ctx context.Context, db *sql.DB, f Folder) (Folder, error) {
	const q = `INSERT INTO folders (id, owner_id, name, parent_id) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, owner_id, name, parent_id, created_at`
	var out Folder
	var parent sql.NullString
	row := db.QueryRowContext(ctx, q, f.OwnerID, f.Name, f.ParentID)
	if err := row.Scan(&out.ID, &out.OwnerID, &out.Name, &parent, &out.CreatedAt); err != nil {
		return Folder{}, err
	}
	if parent.Valid {
		v := parent.String
		out.ParentID = &v
	}
	return out, nil
}

// GetFolder returns a folder by id
func GetFolder(ctx context.Context, db *sql.DB, folderID string) (Folder, error) {
	const q = `SELECT id, name, owner_id, parent_id, created_at FROM folders WHERE id = $1`
	var out Folder
	var parent sql.NullString
	if err := db.QueryRowContext(ctx, q, folderID).Scan(&out.ID, &out.Name, &out.OwnerID, &parent, &out.CreatedAt); err != nil {
		return Folder{}, err
	}
	if parent.Valid {
		v := parent.String
		out.ParentID = &v
	}
	return out, nil
}

// ListFolderFiles returns user_files rows in a folder for a given owner
func ListFolderFiles(ctx context.Context, db *sql.DB, folderID string, limit, offset int) ([]FolderFileRow, error) {
	const q = `
SELECT uf.id, uf.filename, uf.uploaded_at, uf.visibility, fo.id as fo_id, fo.hash, fo.storage_path, fo.size_bytes, fo.mime_type, fo.ref_count, fo.created_at 
FROM user_files uf 
JOIN file_objects fo ON uf.file_object_id = fo.id 
WHERE uf.folder_id = $1 
ORDER BY uf.uploaded_at DESC 
LIMIT $2 OFFSET $3`

	rows, err := db.QueryContext(ctx, q, folderID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []FolderFileRow
	for rows.Next() {
		var uf struct {
			ID         string    `db:"id"`
			Filename   string    `db:"filename"`
			UploadedAt time.Time `db:"uploaded_at"`
			Visibility string    `db:"visibility"`
		}
		var fo struct {
			ID          string    `db:"fo_id"`
			Hash        string    `db:"hash"`
			StoragePath string    `db:"storage_path"`
			SizeBytes   int64     `db:"size_bytes"`
			MimeType    *string   `db:"mime_type"`
			RefCount    int       `db:"ref_count"`
			CreatedAt   time.Time `db:"created_at"`
		}
		if err := rows.Scan(
			&uf.ID, &uf.Filename, &uf.UploadedAt, &uf.Visibility,
			&fo.ID, &fo.Hash, &fo.StoragePath, &fo.SizeBytes, &fo.MimeType, &fo.RefCount, &fo.CreatedAt,
		); err != nil {
			continue
		}
		results = append(results, FolderFileRow{
			UserFileID: uf.ID,
			Filename:   uf.Filename,
			UploadedAt: uf.UploadedAt,
			Visibility: uf.Visibility,
			FileObject: FileStreamInfo{
				ID:          fo.ID,
				StoragePath: fo.StoragePath,
				Filename:    uf.Filename, // Use actual filename, not hash
				MimeType:    getStringValue(fo.MimeType),
				Size:        fo.SizeBytes,
			},
		})
	}
	return results, nil
}

// ListSubfolders returns subfolders of a given folder
func ListSubfolders(ctx context.Context, db *sql.DB, parentID string, limit, offset int) ([]Folder, error) {
	const q = `SELECT id, name, owner_id, parent_id, created_at FROM folders WHERE parent_id = $1 ORDER BY name LIMIT $2 OFFSET $3`
	rows, err := db.QueryContext(ctx, q, parentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []Folder
	for rows.Next() {
		var folder Folder
		var parent sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.OwnerID, &parent, &folder.CreatedAt); err != nil {
			continue
		}
		if parent.Valid {
			v := parent.String
			folder.ParentID = &v
		}
		results = append(results, folder)
	}
	return results, nil
}

// ListUserFolders returns all folders owned by a user
func ListUserFolders(ctx context.Context, db *sql.DB, userID string, limit, offset int) ([]Folder, error) {
	const q = `SELECT id, name, owner_id, parent_id, created_at FROM folders WHERE owner_id = $1 ORDER BY name LIMIT $2 OFFSET $3`
	rows, err := db.QueryContext(ctx, q, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []Folder
	for rows.Next() {
		var folder Folder
		var parent sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.OwnerID, &parent, &folder.CreatedAt); err != nil {
			continue
		}
		if parent.Valid {
			v := parent.String
			folder.ParentID = &v
		}
		results = append(results, folder)
	}
	return results, nil
}

// FolderFileRow convenience type
type FolderFileRow struct {
	UserFileID string
	Filename   string
	UploadedAt time.Time
	Visibility string
	FileObject FileStreamInfo
}

// DeleteFolder deletes a folder and moves its files to the root (folder_id = NULL)
func DeleteFolder(ctx context.Context, db *sql.DB, folderID string, userID string) error {
	// Start a transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// First, verify the user owns the folder
	var ownerID string
	err = tx.QueryRowContext(ctx, "SELECT owner_id FROM folders WHERE id = $1", folderID).Scan(&ownerID)
	if err != nil {
		return err
	}
	if ownerID != userID {
		return fmt.Errorf("permission denied: user does not own this folder")
	}

	// Move all files in this folder to root (set folder_id to NULL)
	_, err = tx.ExecContext(ctx, "UPDATE user_files SET folder_id = NULL WHERE folder_id = $1", folderID)
	if err != nil {
		return err
	}

	// Move all subfolders to root (set parent_id to NULL)
	_, err = tx.ExecContext(ctx, "UPDATE folders SET parent_id = NULL WHERE parent_id = $1", folderID)
	if err != nil {
		return err
	}

	// Delete the folder
	_, err = tx.ExecContext(ctx, "DELETE FROM folders WHERE id = $1", folderID)
	if err != nil {
		return err
	}

	// Commit the transaction
	return tx.Commit()
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
