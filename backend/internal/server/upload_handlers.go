package server

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/storage"
)

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func UploadHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse multipart form (limits total memory buffering for file headers)
		if err := r.ParseMultipartForm(200 << 20); err != nil {
			http.Error(w, "parse multipart error: "+err.Error(), http.StatusBadRequest)
			return
		}

		files := r.MultipartForm.File["files"]
		if len(files) == 0 {
			http.Error(w, "no files in 'files' field", http.StatusBadRequest)
			return
		}

		userID := GetUserIDFromContext(r)
		if userID == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		storageRoot := os.Getenv("STORAGE_PATH")
		if storageRoot == "" {
			storageRoot = "/data/files"
		}

		tmpDir := filepath.Join(storageRoot, "tmp")
		if err := os.MkdirAll(tmpDir, 0o755); err != nil {
			http.Error(w, "tmp mkdir: "+err.Error(), http.StatusInternalServerError)
			return
		}

		var results []map[string]interface{}

		for _, fh := range files {
			f, err := fh.Open()
			if err != nil {
				http.Error(w, "open file: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// read first 512 bytes for mime detection
			head := make([]byte, 512)
			n, _ := io.ReadFull(f, head)
			detectedMime := http.DetectContentType(head[:n])
			declared := fh.Header.Get("Content-Type")

			if declared != "" && declared != detectedMime {
				// Strict validation
				f.Close()
				http.Error(w, fmt.Sprintf("mime mismatch for %s: declared=%s detected=%s", fh.Filename, declared, detectedMime), http.StatusBadRequest)
				return
			}

			// create tmp file and write head
			tmpFile, err := os.CreateTemp(tmpDir, "upload-*")
			if err != nil {
				f.Close()
				http.Error(w, "tmp create: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if _, err := tmpFile.Write(head[:n]); err != nil {
				f.Close()
				tmpFile.Close()
				http.Error(w, "tmp write head: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// stream rest and hash
			hasher := sha256.New()
			hasher.Write(head[:n])
			written, err := io.Copy(io.MultiWriter(tmpFile, hasher), f)
			if err != nil {
				f.Close()
				tmpFile.Close()
				http.Error(w, "stream copy: "+err.Error(), http.StatusInternalServerError)
				return
			}

			totalSize := int64(n) + written
			f.Close()
			tmpFile.Close()

			hash := hex.EncodeToString(hasher.Sum(nil))

			// dedup check
			fo, err := storage.FindFileObjectByHash(db, hash)
			if err != nil {
				http.Error(w, "db error: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if fo == nil {
				// store file under storageRoot/<first2>/<hash>
				subdir := filepath.Join(storageRoot, hash[:2])
				if err := os.MkdirAll(subdir, 0o755); err != nil {
					http.Error(w, "mkdir final: "+err.Error(), http.StatusInternalServerError)
					return
				}

				finalPath := filepath.Join(subdir, hash)

				// move temp -> final
				if err := os.Rename(tmpFile.Name(), finalPath); err != nil {
					// fallback: copy
					if err := copyFile(tmpFile.Name(), finalPath); err != nil {
						http.Error(w, "store file failed: "+err.Error(), http.StatusInternalServerError)
						return
					}
					os.Remove(tmpFile.Name())
				}

				fo, err = storage.CreateFileObject(db, hash, finalPath, totalSize, detectedMime)
				if err != nil {
					http.Error(w, "create file object: "+err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				// increment ref count
				if err := storage.IncrementRefCount(db, fo.ID); err != nil {
					http.Error(w, "increment ref failed: "+err.Error(), http.StatusInternalServerError)
					return
				}
			}

			// create user_files entry
			var userFileID string
			err = db.Get(&userFileID, "INSERT INTO user_files (id, user_id, file_object_id, filename) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id", userID, fo.ID, fh.Filename)
			if err != nil {
				http.Error(w, "create user_file failed: "+err.Error(), http.StatusInternalServerError)
				return
			}

			results = append(results, map[string]interface{}{
				"filename":       fh.Filename,
				"file_object_id": fo.ID,
				"user_file_id":   userFileID,
				"hash":           hash,
				"size_bytes":     totalSize,
				"mime_type":      detectedMime,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}
}
