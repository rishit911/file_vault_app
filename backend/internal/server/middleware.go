package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/rishit911/file_vault_proj-backend/internal/auth"
)

type ctxKey string

const userIDKey ctxKey = "userID"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "missing Authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "invalid Authorization header", http.StatusUnauthorized)
			return
		}

		token := parts[1]
		userID, err := auth.ParseAndValidateJWT(token)
		if err != nil || userID == "" {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}

func GetUserIDFromContext(r *http.Request) string {
	if v := r.Context().Value(userIDKey); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
