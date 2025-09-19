package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rishit911/file_vault_proj-backend/internal/auth"
)

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func RegisterHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerReq
		_ = json.NewDecoder(r.Body).Decode(&req)

		if req.Email == "" || req.Password == "" {
			http.Error(w, "email & password required", http.StatusBadRequest)
			return
		}

		pwHash, err := auth.HashPassword(req.Password)
		if err != nil {
			http.Error(w, "hash failed", http.StatusInternalServerError)
			return
		}

		id := uuid.New().String()
		_, err = db.Exec(`INSERT INTO users (id, email, password_hash) VALUES ($1,$2,$3)`, id, req.Email, pwHash)
		if err != nil {
			http.Error(w, "user create failed", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
	}
}

func LoginHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginReq
		_ = json.NewDecoder(r.Body).Decode(&req)

		if req.Email == "" || req.Password == "" {
			http.Error(w, "email & password required", http.StatusBadRequest)
			return
		}

		var id, pwHash string
		err := db.QueryRowx(`SELECT id, password_hash FROM users WHERE email=$1`, req.Email).Scan(&id, &pwHash)
		if err != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		if err := auth.CompareHashAndPassword(pwHash, req.Password); err != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		token, err := auth.GenerateJWT(id, 24*time.Hour)
		if err != nil {
			http.Error(w, "token error", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]string{"token": token})
	}
}
