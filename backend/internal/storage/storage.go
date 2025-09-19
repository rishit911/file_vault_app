package storage

import (
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type FileObject struct {
	ID          string `db:"id"`
	Hash        string `db:"hash"`
	StoragePath string `db:"storage_path"`
	SizeBytes   int64  `db:"size_bytes"`
	MimeType    string `db:"mime_type"`
	RefCount    int    `db:"ref_count"`
	CreatedAt   string `db:"created_at"`
}

func FindFileObjectByHash(db *sqlx.DB, hash string) (*FileObject, error) {
	var fo FileObject
	err := db.Get(&fo, "SELECT * FROM file_objects WHERE hash=$1", hash)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &fo, nil
}

func CreateFileObject(db *sqlx.DB, hash, storagePath string, size int64, mime string) (*FileObject, error) {
	id := uuid.New().String()
	_, err := db.Exec(`INSERT INTO file_objects (id, hash, storage_path, size_bytes, mime_type, ref_count) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, hash, storagePath, size, mime, 1)
	if err != nil {
		return nil, err
	}

	return &FileObject{
		ID:          id,
		Hash:        hash,
		StoragePath: storagePath,
		SizeBytes:   size,
		MimeType:    mime,
		RefCount:    1,
	}, nil
}

func IncrementRefCount(db *sqlx.DB, id string) error {
	_, err := db.Exec("UPDATE file_objects SET ref_count = ref_count + 1 WHERE id=$1", id)
	return err
}
