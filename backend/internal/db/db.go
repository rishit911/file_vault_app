package db

import (
	"fmt"
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func ConnectFromEnv() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// default local dev string (not committed)
		dsn = fmt.Sprintf("postgres://filevault_user:filevault_pass@localhost:5433/filevault_db?sslmode=disable")
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return err
	}

	DB = db
	return nil
}