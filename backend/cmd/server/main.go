package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/rishit911/file_vault_proj-backend/internal/db"
)

func main() {
	// Connect to DB
	log.Println("Connecting to DB...")
	if err := db.ConnectFromEnv(); err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	log.Println("DB connected")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// simple server with read/write timeouts
	srv := &http.Server{
		Addr:         ":" + getEnv("PORT", "8080"),
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Starting server on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}