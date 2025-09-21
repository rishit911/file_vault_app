package crypto

import "testing"

func TestGenerateShareToken(t *testing.T) {
	tok, err := GenerateShareToken(18)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tok) == 0 {
		t.Fatalf("expected non-empty token")
	}
}