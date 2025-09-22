package db

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `db:"id"`
	Email     string    `db:"email"`
	Username  *string   `db:"username"`
	Role      string    `db:"role"`
	CreatedAt time.Time `db:"created_at"`
}

type UserShare struct {
	ID           uuid.UUID `db:"id"`
	FileID       uuid.UUID `db:"file_id"`
	OwnerID      uuid.UUID `db:"owner_id"`
	SharedWithID uuid.UUID `db:"shared_with_id"`
	SharedAt     time.Time `db:"shared_at"`
	Message      *string   `db:"message"`
}

type UserShareWithDetails struct {
	UserShare
	OwnerEmail         string  `db:"owner_email"`
	OwnerUsername      *string `db:"owner_username"`
	SharedWithEmail    string  `db:"shared_with_email"`
	SharedWithUsername *string `db:"shared_with_username"`
	Filename           string  `db:"filename"`
	FileSize           int64   `db:"file_size"`
	MimeType           *string `db:"mime_type"`
}

type UserFileWithDetails struct {
	ID           uuid.UUID `db:"id"`
	UserID       uuid.UUID `db:"user_id"`
	FileObjectID uuid.UUID `db:"file_object_id"`
	Filename     string    `db:"filename"`
	Visibility   string    `db:"visibility"`
	UploadedAt   time.Time `db:"uploaded_at"`
	Hash         string    `db:"hash"`
	StoragePath  string    `db:"storage_path"`
	SizeBytes    int64     `db:"size_bytes"`
	MimeType     *string   `db:"mime_type"`
	RefCount     int       `db:"ref_count"`
	CreatedAt    time.Time `db:"created_at"`
}

func CreateUserShare(fileID, ownerID, sharedWithID uuid.UUID, message *string) (*UserShare, error) {
	share := &UserShare{
		ID:           uuid.New(),
		FileID:       fileID,
		OwnerID:      ownerID,
		SharedWithID: sharedWithID,
		SharedAt:     time.Now(),
		Message:      message,
	}

	query := `
		INSERT INTO user_shares (id, file_id, owner_id, shared_with_id, shared_at, message)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (file_id, owner_id, shared_with_id) DO UPDATE SET
			shared_at = EXCLUDED.shared_at,
			message = EXCLUDED.message
		RETURNING id, file_id, owner_id, shared_with_id, shared_at, message
	`

	err := DB.QueryRow(query, share.ID, share.FileID, share.OwnerID, share.SharedWithID, share.SharedAt, share.Message).
		Scan(&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithID, &share.SharedAt, &share.Message)
	if err != nil {
		return nil, err
	}

	return share, nil
}

func GetUserSharesSharedWithMe(userID uuid.UUID, limit, offset int) ([]*UserShareWithDetails, error) {
	query := `
		SELECT 
			us.id, us.file_id, us.owner_id, us.shared_with_id, us.shared_at, us.message,
			owner.email as owner_email, owner.username as owner_username,
			shared_with.email as shared_with_email, shared_with.username as shared_with_username,
			uf.filename, fo.size_bytes as file_size, fo.mime_type
		FROM user_shares us
		JOIN users owner ON us.owner_id = owner.id
		JOIN users shared_with ON us.shared_with_id = shared_with.id
		JOIN user_files uf ON us.file_id = uf.file_object_id AND us.owner_id = uf.user_id
		JOIN file_objects fo ON uf.file_object_id = fo.id
		WHERE us.shared_with_id = $1
		ORDER BY us.shared_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := DB.Query(query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []*UserShareWithDetails
	for rows.Next() {
		share := &UserShareWithDetails{}
		err := rows.Scan(
			&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithID, &share.SharedAt, &share.Message,
			&share.OwnerEmail, &share.OwnerUsername,
			&share.SharedWithEmail, &share.SharedWithUsername,
			&share.Filename, &share.FileSize, &share.MimeType,
		)
		if err != nil {
			return nil, err
		}
		shares = append(shares, share)
	}

	return shares, nil
}

func GetMyUserShares(userID uuid.UUID, limit, offset int) ([]*UserShareWithDetails, error) {
	query := `
		SELECT 
			us.id, us.file_id, us.owner_id, us.shared_with_id, us.shared_at, us.message,
			owner.email as owner_email, owner.username as owner_username,
			shared_with.email as shared_with_email, shared_with.username as shared_with_username,
			uf.filename, fo.size_bytes as file_size, fo.mime_type
		FROM user_shares us
		JOIN users owner ON us.owner_id = owner.id
		JOIN users shared_with ON us.shared_with_id = shared_with.id
		JOIN user_files uf ON us.file_id = uf.file_object_id AND us.owner_id = uf.user_id
		JOIN file_objects fo ON uf.file_object_id = fo.id
		WHERE us.owner_id = $1
		ORDER BY us.shared_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := DB.Query(query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []*UserShareWithDetails
	for rows.Next() {
		share := &UserShareWithDetails{}
		err := rows.Scan(
			&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithID, &share.SharedAt, &share.Message,
			&share.OwnerEmail, &share.OwnerUsername,
			&share.SharedWithEmail, &share.SharedWithUsername,
			&share.Filename, &share.FileSize, &share.MimeType,
		)
		if err != nil {
			return nil, err
		}
		shares = append(shares, share)
	}

	return shares, nil
}

func DeleteUserShare(shareID, userID uuid.UUID) error {
	query := `DELETE FROM user_shares WHERE id = $1 AND owner_id = $2`
	result, err := DB.Exec(query, shareID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func SearchUsersByUsernameOrEmail(query string, limit int) ([]*User, error) {
	sqlQuery := `
		SELECT id, email, username, role, created_at
		FROM users
		WHERE (username ILIKE $1 OR email ILIKE $1)
		AND username IS NOT NULL
		ORDER BY 
			CASE WHEN username ILIKE $1 THEN 1 ELSE 2 END,
			username, email
		LIMIT $2
	`

	searchPattern := "%" + query + "%"
	rows, err := DB.Query(sqlQuery, searchPattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		user := &User{}
		err := rows.Scan(&user.ID, &user.Email, &user.Username, &user.Role, &user.CreatedAt)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func GetUserByUsername(username string) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, role, created_at FROM users WHERE username = $1`
	err := DB.QueryRow(query, username).Scan(&user.ID, &user.Email, &user.Username, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func UpdateUserUsername(userID uuid.UUID, username string) error {
	query := `UPDATE users SET username = $1 WHERE id = $2`
	_, err := DB.Exec(query, username, userID)
	return err
}

func GetUserByID(userID uuid.UUID) (*User, error) {
	user := &User{}
	query := `SELECT id, email, username, role, created_at FROM users WHERE id = $1`
	err := DB.QueryRow(query, userID).Scan(&user.ID, &user.Email, &user.Username, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func GetUserFileByFileID(userFileID, userID uuid.UUID) (*UserFileWithDetails, error) {
	userFile := &UserFileWithDetails{}
	query := `
		SELECT 
			uf.id, uf.user_id, uf.file_object_id, uf.filename, uf.visibility, uf.uploaded_at,
			fo.hash, fo.storage_path, fo.size_bytes, fo.mime_type, fo.ref_count, fo.created_at
		FROM user_files uf
		JOIN file_objects fo ON uf.file_object_id = fo.id
		WHERE uf.id = $1 AND uf.user_id = $2
	`
	err := DB.QueryRow(query, userFileID, userID).Scan(
		&userFile.ID, &userFile.UserID, &userFile.FileObjectID, &userFile.Filename, &userFile.Visibility, &userFile.UploadedAt,
		&userFile.Hash, &userFile.StoragePath, &userFile.SizeBytes, &userFile.MimeType, &userFile.RefCount, &userFile.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return userFile, nil
}

// Additional functions needed for shared file downloads

type FileObject struct {
	ID          uuid.UUID `db:"id"`
	Hash        string    `db:"hash"`
	StoragePath string    `db:"storage_path"`
	SizeBytes   int64     `db:"size_bytes"`
	MimeType    *string   `db:"mime_type"`
	RefCount    int       `db:"ref_count"`
	CreatedAt   time.Time `db:"created_at"`
}

func GetUserShareByID(shareID, userID uuid.UUID) (*UserShare, error) {
	share := &UserShare{}
	query := `
		SELECT id, file_id, owner_id, shared_with_id, shared_at, message
		FROM user_shares
		WHERE id = $1 AND shared_with_id = $2
	`
	err := DB.QueryRow(query, shareID, userID).Scan(
		&share.ID, &share.FileID, &share.OwnerID, &share.SharedWithID, &share.SharedAt, &share.Message,
	)
	if err != nil {
		return nil, err
	}
	return share, nil
}

func GetFileObjectByID(fileObjectID uuid.UUID) (*FileObject, error) {
	fileObject := &FileObject{}
	query := `
		SELECT id, hash, storage_path, size_bytes, mime_type, ref_count, created_at
		FROM file_objects
		WHERE id = $1
	`
	err := DB.QueryRow(query, fileObjectID).Scan(
		&fileObject.ID, &fileObject.Hash, &fileObject.StoragePath, &fileObject.SizeBytes,
		&fileObject.MimeType, &fileObject.RefCount, &fileObject.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return fileObject, nil
}

func GetUserFileByFileObjectID(fileObjectID, ownerID uuid.UUID) (*UserFileWithDetails, error) {
	userFile := &UserFileWithDetails{}
	query := `
		SELECT 
			uf.id, uf.user_id, uf.file_object_id, uf.filename, uf.visibility, uf.uploaded_at,
			fo.hash, fo.storage_path, fo.size_bytes, fo.mime_type, fo.ref_count, fo.created_at
		FROM user_files uf
		JOIN file_objects fo ON uf.file_object_id = fo.id
		WHERE uf.file_object_id = $1 AND uf.user_id = $2
	`
	err := DB.QueryRow(query, fileObjectID, ownerID).Scan(
		&userFile.ID, &userFile.UserID, &userFile.FileObjectID, &userFile.Filename, &userFile.Visibility, &userFile.UploadedAt,
		&userFile.Hash, &userFile.StoragePath, &userFile.SizeBytes, &userFile.MimeType, &userFile.RefCount, &userFile.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return userFile, nil
}
