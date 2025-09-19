package auth

import (
	"testing"
	"time"
)

func TestHashPassword(t *testing.T) {
	password := "testpassword123"

	// Test password hashing
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == "" {
		t.Fatal("HashPassword returned empty hash")
	}

	if hash == password {
		t.Fatal("HashPassword returned plaintext password")
	}
}

func TestCompareHashAndPassword(t *testing.T) {
	password := "testpassword123"
	wrongPassword := "wrongpassword"

	// Hash the password
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	// Test correct password
	err = CompareHashAndPassword(hash, password)
	if err != nil {
		t.Errorf("CompareHashAndPassword failed for correct password: %v", err)
	}

	// Test wrong password
	err = CompareHashAndPassword(hash, wrongPassword)
	if err == nil {
		t.Error("CompareHashAndPassword should fail for wrong password")
	}
}

func TestJWTGeneration(t *testing.T) {
	userID := "test-user-id"
	duration := time.Hour

	// Generate JWT
	token, err := GenerateJWT(userID, duration)
	if err != nil {
		t.Fatalf("GenerateJWT failed: %v", err)
	}

	if token == "" {
		t.Fatal("GenerateJWT returned empty token")
	}

	// Parse and validate JWT
	parsedUserID, err := ParseAndValidateJWT(token)
	if err != nil {
		t.Fatalf("ParseAndValidateJWT failed: %v", err)
	}

	if parsedUserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, parsedUserID)
	}
}

func TestJWTExpiration(t *testing.T) {
	userID := "test-user-id"
	duration := -time.Hour // Expired token

	// Generate expired JWT
	token, err := GenerateJWT(userID, duration)
	if err != nil {
		t.Fatalf("GenerateJWT failed: %v", err)
	}

	// Try to parse expired token
	_, err = ParseAndValidateJWT(token)
	if err == nil {
		t.Error("ParseAndValidateJWT should fail for expired token")
	}
}
