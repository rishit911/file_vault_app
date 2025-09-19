package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/rishit911/file_vault_proj-backend/internal/db"
	"github.com/rishit911/file_vault_proj-backend/internal/server"
	"github.com/rishit911/file_vault_proj-backend/graph"
)

func main() {
	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		// Try loading from backend directory if running from root
		if err := godotenv.Load("backend/.env"); err != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	// Connect to DB
	log.Println("Connecting to DB...")
	if err := db.ConnectFromEnv(); err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	log.Println("DB connected")

	mux := http.NewServeMux()

	// public
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})
	mux.HandleFunc("/api/v1/auth/register", server.RegisterHandler(db.DB))
	mux.HandleFunc("/api/v1/auth/login", server.LoginHandler(db.DB))

	// protected routes with AuthMiddleware
	mux.Handle("/api/v1/files/upload", server.AuthMiddleware(server.UploadHandler(db.DB)))
	mux.Handle("/api/v1/files/register", server.AuthMiddleware(server.RegisterFileHandler(db.DB)))
	mux.Handle("/api/v1/files", server.AuthMiddleware(server.ListFilesHandler(db.DB))) // GET lists user files

	// delete - pattern: /api/v1/files/{id}
	mux.Handle("/api/v1/files/", server.AuthMiddleware(server.DeleteFileHandler(db.DB)))

	// GraphQL playground & endpoint
	playgroundHandler := playground.Handler("GraphQL", "/graphql")
	mux.HandleFunc("/playground", func(w http.ResponseWriter, r *http.Request) {
		playgroundHandler.ServeHTTP(w, r)
	})

	gqlSrv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{DB: db.DB},
	}))
	mux.Handle("/graphql", server.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// let gql handler use context: delegate to gqlSrv
		gqlSrv.ServeHTTP(w, r)
	})))

	// CORS middleware wrapper
	corsHandler := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			
			next.ServeHTTP(w, r)
		})
	}

	// simple server with read/write timeouts
	srv := &http.Server{
		Addr:         ":" + getEnv("PORT", "8080"),
		Handler:      corsHandler(mux),
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
