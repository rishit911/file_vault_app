package graph_test

import (
	"context"
	"testing"
	"time"

	"github.com/rishit911/file_vault_proj-backend/internal/auth"
)

func TestAuthFunctions(t *testing.T) {
	// Test password hashing
	password := "TestPassword123"
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	// Test password comparison
	err = auth.CompareHashAndPassword(hash, password)
	if err != nil {
		t.Errorf("Password comparison failed: %v", err)
	}

	// Test wrong password
	err = auth.CompareHashAndPassword(hash, "WrongPassword")
	if err == nil {
		t.Error("Password comparison should fail for wrong password")
	}
}

func TestJWTWorkflow(t *testing.T) {
	userID := "test-user-123"

	// Generate JWT
	token, err := auth.GenerateJWT(userID, time.Hour*24) // 24 hours
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	// Validate JWT
	parsedUserID, err := auth.ParseAndValidateJWT(token)
	if err != nil {
		t.Fatalf("Failed to parse JWT: %v", err)
	}

	if parsedUserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, parsedUserID)
	}
}

func TestContextValues(t *testing.T) {
	ctx := context.Background()
	userID := "test-user-456"

	// Test context with user ID
	ctx = context.WithValue(ctx, "userID", userID)
	retrievedUserID, ok := ctx.Value("userID").(string)
	if !ok {
		t.Fatal("Failed to retrieve userID from context")
	}

	if retrievedUserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, retrievedUserID)
	}
}

// Mock test for GraphQL resolver pattern
func TestResolverPattern(t *testing.T) {
	// This is a simple test to verify the resolver pattern works
	// In a full integration test, you would:
	// 1. Set up a test database
	// 2. Create resolver instances
	// 3. Call resolver methods
	// 4. Assert results

	t.Log("GraphQL resolver pattern test placeholder")
	t.Log("For full integration tests, set up test database and call resolvers")
}