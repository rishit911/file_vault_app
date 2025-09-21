package db

import (
	"context"
	"database/sql"
	"time"
)

// Share represents shares table row.
type Share struct {
	ID           string
	FileID       *string
	FolderID     *string
	OwnerID      string
	Token        string
	Public       bool
	ExpiresAt    *time.Time
	MaxDownloads *int
	CreatedAt    time.Time
}

type DownloadRecord struct {
	ID           int64
	ShareID      *string
	FileID       string
	DownloaderID *string
	IP           *string
	UserAgent    *string
	CreatedAt    time.Time
}

// CreateShare inserts share row and returns populated share.
func CreateShare(ctx context.Context, db *sql.DB, s Share) (Share, error) {
	const q = `
INSERT INTO shares (file_id, folder_id, owner_id, token, public, expires_at, max_downloads)
VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id, file_id, folder_id, owner_id, token, public, expires_at, max_downloads, created_at
`
	var out Share
	var fileID sql.NullString
	var folderID sql.NullString
	var expires sql.NullTime
	var maxDownloads sql.NullInt64

	row := db.QueryRowContext(ctx, q, s.FileID, s.FolderID, s.OwnerID, s.Token, s.Public, s.ExpiresAt, s.MaxDownloads)
	if err := row.Scan(&out.ID, &fileID, &folderID, &out.OwnerID, &out.Token, &out.Public, &expires, &maxDownloads, &out.CreatedAt); err != nil {
		return Share{}, err
	}
	if fileID.Valid {
		v := fileID.String
		out.FileID = &v
	}
	if folderID.Valid {
		v := folderID.String
		out.FolderID = &v
	}
	if expires.Valid {
		t := expires.Time
		out.ExpiresAt = &t
	}
	if maxDownloads.Valid {
		v := int(maxDownloads.Int64)
		out.MaxDownloads = &v
	}
	return out, nil
}

// GetShareByToken fetches share by token.
func GetShareByToken(ctx context.Context, db *sql.DB, token string) (Share, error) {
	const q = `SELECT id, file_id, folder_id, owner_id, token, public, expires_at, max_downloads, created_at FROM shares WHERE token = $1`
	var out Share
	var fileID sql.NullString
	var folderID sql.NullString
	var expires sql.NullTime
	var maxDownloads sql.NullInt64

	row := db.QueryRowContext(ctx, q, token)
	if err := row.Scan(&out.ID, &fileID, &folderID, &out.OwnerID, &out.Token, &out.Public, &expires, &maxDownloads, &out.CreatedAt); err != nil {
		return Share{}, err
	}
	if fileID.Valid {
		v := fileID.String
		out.FileID = &v
	}
	if folderID.Valid {
		v := folderID.String
		out.FolderID = &v
	}
	if expires.Valid {
		t := expires.Time
		out.ExpiresAt = &t
	}
	if maxDownloads.Valid {
		v := int(maxDownloads.Int64)
		out.MaxDownloads = &v
	}
	return out, nil
}

// CountDownloadsForShare returns count of download rows where share_id = shareID.
func CountDownloadsForShare(ctx context.Context, db *sql.DB, shareID string) (int, error) {
	var n int
	err := db.QueryRowContext(ctx, `SELECT COUNT(1) FROM downloads WHERE share_id = $1`, shareID).Scan(&n)
	return n, err
}

// CreateDownloadRecord increments file_objects.download_count and inserts downloads record (atomic).
func CreateDownloadRecord(ctx context.Context, db *sql.DB, shareID *string, fileID string, downloaderID *string, ip *string, userAgent *string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `UPDATE file_objects SET download_count = download_count + 1 WHERE id = $1`, fileID)
	if err != nil {
		tx.Rollback()
		return err
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO downloads (share_id, file_id, downloader_id, ip, user_agent) VALUES ($1,$2,$3,$4,$5)`, shareID, fileID, downloaderID, ip, userAgent)
	if err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

// GetFileStreamInfo returns fields needed to stream file: storage_path, filename, mime_type, size_bytes.
// Note: adjust the SELECT if your column names differ.
type FileStreamInfo struct {
	ID          string
	StoragePath string
	Filename    string
	MimeType    string
	Size        int64
}

func GetFileStreamInfo(ctx context.Context, db *sql.DB, fileID string) (FileStreamInfo, error) {
	var info FileStreamInfo
	const q = `
SELECT fo.id, fo.storage_path, uf.filename, fo.mime_type, fo.size_bytes 
FROM file_objects fo 
JOIN user_files uf ON fo.id = uf.file_object_id 
WHERE fo.id = $1 
LIMIT 1`
	if err := db.QueryRowContext(ctx, q, fileID).Scan(&info.ID, &info.StoragePath, &info.Filename, &info.MimeType, &info.Size); err != nil {
		return FileStreamInfo{}, err
	}
	return info, nil
}

// GetFileOwnerID gets the owner ID from user_files table using user_files.id
// This function expects the user_files.id (which is what the Files query returns)
func GetFileOwnerID(ctx context.Context, db *sql.DB, userFileID string) (string, error) {
	var ownerID string
	err := db.QueryRowContext(ctx, `SELECT user_id FROM user_files WHERE id = $1 LIMIT 1`, userFileID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return "", sql.ErrNoRows
	}
	if err != nil {
		return "", err
	}
	return ownerID, nil
}

// GetFileObjectID gets the file_objects.id from user_files.id
// This is needed for creating shares since shares table references file_objects.id
func GetFileObjectID(ctx context.Context, db *sql.DB, userFileID string) (string, error) {
	var fileObjectID string
	err := db.QueryRowContext(ctx, `SELECT file_object_id FROM user_files WHERE id = $1 LIMIT 1`, userFileID).Scan(&fileObjectID)
	if err == sql.ErrNoRows {
		return "", sql.ErrNoRows
	}
	if err != nil {
		return "", err
	}
	return fileObjectID, nil
}

// ListSharesByOwner lists shares owned by a specific user with pagination
func ListSharesByOwner(ctx context.Context, db *sql.DB, ownerID string, limit, offset int) ([]Share, error) {
	const q = `
		SELECT id, file_id, folder_id, owner_id, token, public, expires_at, max_downloads, created_at 
		FROM shares 
		WHERE owner_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3
	`
	
	rows, err := db.QueryContext(ctx, q, ownerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var shares []Share
	for rows.Next() {
		var s Share
		err := rows.Scan(
			&s.ID,
			&s.FileID,
			&s.FolderID,
			&s.OwnerID,
			&s.Token,
			&s.Public,
			&s.ExpiresAt,
			&s.MaxDownloads,
			&s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		shares = append(shares, s)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return shares, nil
}
