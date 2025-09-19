package graph

// This file will contain resolver implementations for the GraphQL operations.

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rishit911/file_vault_proj-backend/graph/generated"
	"github.com/rishit911/file_vault_proj-backend/graph/model"
	"github.com/rishit911/file_vault_proj-backend/internal/auth"
)

func (r *Resolver) Mutation() generated.MutationResolver { return &mutationResolver{r} }
func (r *Resolver) Query() generated.QueryResolver       { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }

// Register user
func (m *mutationResolver) Register(ctx context.Context, email string, password string) (*model.AuthPayload, error) {
	hashed, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	id := uuid.New().String()
	_, err = m.DB.Exec(`INSERT INTO users (id, email, password_hash) VALUES ($1,$2,$3)`, id, email, hashed)
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateJWT(id, 24*time.Hour)
	if err != nil {
		return nil, err
	}

	return &model.AuthPayload{
		Token: token,
		User: &model.User{
			ID:        id,
			Email:     email,
			Role:      "user",
			CreatedAt: time.Now(),
		},
	}, nil
}

// Login
func (m *mutationResolver) Login(ctx context.Context, email string, password string) (*model.AuthPayload, error) {
	var id, pwHash string
	if err := m.DB.QueryRowx(`SELECT id, password_hash FROM users WHERE email=$1`, email).Scan(&id, &pwHash); err != nil {
		return nil, err
	}

	if err := auth.CompareHashAndPassword(pwHash, password); err != nil {
		return nil, err
	}

	token, err := auth.GenerateJWT(id, 24*time.Hour)
	if err != nil {
		return nil, err
	}

	var createdAt time.Time
	_ = m.DB.Get(&createdAt, "SELECT created_at FROM users WHERE id=$1", id)

	return &model.AuthPayload{
		Token: token,
		User: &model.User{
			ID:        id,
			Email:     email,
			Role:      "user",
			CreatedAt: createdAt,
		},
	}, nil
}

// Me
func (q *queryResolver) Me(ctx context.Context) (*model.User, error) {
	// Extract user from context (AuthMiddleware sets user id on context)
	// The AuthMiddleware uses key "userID" as string in server package. To access it,
	// we can attempt to read from context.Value("userID") here.
	if ctx == nil {
		return nil, nil
	}

	if v := ctx.Value("userID"); v != nil {
		if id, ok := v.(string); ok {
			var u model.User
			if err := q.DB.Get(&u, "SELECT id, email, role, created_at FROM users WHERE id=$1", id); err == nil {
				return &u, nil
			}
		}
	}
	return nil, nil
}

// RegisterFile is the resolver for the registerFile field.
func (r *mutationResolver) RegisterFile(ctx context.Context, input model.RegisterFileInput) (*model.RegisterFilePayload, error) {
	panic("not implemented: RegisterFile - registerFile")
}

// DeleteFile is the resolver for the deleteFile field.
func (r *mutationResolver) DeleteFile(ctx context.Context, userFileID string) (*model.DeletePayload, error) {
	panic("not implemented: DeleteFile - deleteFile")
}

// File is the resolver for the file field.
func (r *queryResolver) File(ctx context.Context, userFileID string) (*model.UserFile, error) {
	panic("not implemented: File - file")
}

// Files is the resolver for the files field.
func (r *queryResolver) Files(ctx context.Context, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented: Files - files")
}

func (r *queryResolver) SearchFiles(ctx context.Context, q string, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented: SearchFiles - searchFiles")
}

// AdminFiles is the resolver for the adminFiles field.
func (r *queryResolver) AdminFiles(ctx context.Context, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented: AdminFiles - adminFiles")
}

// Stats is the resolver for the stats field.
func (r *queryResolver) Stats(ctx context.Context) (*model.StorageStats, error) {
	panic("not implemented: Stats - stats")
}
