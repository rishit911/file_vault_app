package cryptoutil

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// GenerateShareToken returns a URL-safe token encoded with RawURLEncoding.
// Use n >= 18 for strong entropy.
func GenerateShareToken(n int) (string, error) {
	if n <= 0 {
		n = 24
	}
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("crypto/rand read: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}