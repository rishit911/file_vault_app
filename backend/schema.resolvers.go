package graph

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"time"

	"github.com/rishit911/file_vault_proj-backend/graph/generated"
	"github.com/rishit911/file_vault_proj-backend/graph/model"
)

type Resolver struct{}

// Register is the resolver for the register field.
func (r *mutationResolver) Register(ctx context.Context, email string, password string) (*model.AuthPayload, error) {
	panic("not implemented")
}

// Login is the resolver for the login field.
func (r *mutationResolver) Login(ctx context.Context, email string, password string) (*model.AuthPayload, error) {
	panic("not implemented")
}

// RegisterFile is the resolver for the registerFile field.
func (r *mutationResolver) RegisterFile(ctx context.Context, input model.RegisterFileInput) (*model.RegisterFilePayload, error) {
	panic("not implemented")
}

// DeleteFile is the resolver for the deleteFile field.
func (r *mutationResolver) DeleteFile(ctx context.Context, userFileID string) (*model.DeletePayload, error) {
	panic("not implemented")
}

// CreateShare is the resolver for the createShare field.
func (r *mutationResolver) CreateShare(ctx context.Context, input model.ShareCreateInput) (*model.ShareCreatePayload, error) {
	panic("not implemented")
}

// RevokeShare is the resolver for the revokeShare field.
func (r *mutationResolver) RevokeShare(ctx context.Context, token string) (bool, error) {
	panic("not implemented")
}

// AddTagToFile is the resolver for the addTagToFile field.
func (r *mutationResolver) AddTagToFile(ctx context.Context, fileID string, tagName string) (bool, error) {
	panic("not implemented")
}

// RemoveTagFromFile is the resolver for the removeTagFromFile field.
func (r *mutationResolver) RemoveTagFromFile(ctx context.Context, fileID string, tagName string) (bool, error) {
	panic("not implemented")
}

// CreateTag is the resolver for the createTag field.
func (r *mutationResolver) CreateTag(ctx context.Context, name string) (*model.Tag, error) {
	panic("not implemented")
}

// DeleteTag is the resolver for the deleteTag field.
func (r *mutationResolver) DeleteTag(ctx context.Context, name string) (bool, error) {
	panic("not implemented")
}

// CreateFolder is the resolver for the createFolder field.
func (r *mutationResolver) CreateFolder(ctx context.Context, input model.CreateFolderInput) (*model.Folder, error) {
	panic("not implemented")
}

// RenameFolder is the resolver for the renameFolder field.
func (r *mutationResolver) RenameFolder(ctx context.Context, folderID string, name string) (*model.Folder, error) {
	panic("not implemented")
}

// DeleteFolder is the resolver for the deleteFolder field.
func (r *mutationResolver) DeleteFolder(ctx context.Context, folderID string) (bool, error) {
	panic("not implemented")
}

// MoveFileToFolder is the resolver for the moveFileToFolder field.
func (r *mutationResolver) MoveFileToFolder(ctx context.Context, userFileID string, folderID *string) (bool, error) {
	panic("not implemented")
}

// ShareFolder is the resolver for the shareFolder field.
func (r *mutationResolver) ShareFolder(ctx context.Context, folderID string, public *bool, expiresAt *time.Time, maxDownloads *int) (*model.ShareCreatePayload, error) {
	panic("not implemented")
}

// Me is the resolver for the me field.
func (r *queryResolver) Me(ctx context.Context) (*model.User, error) {
	panic("not implemented")
}

// File is the resolver for the file field.
func (r *queryResolver) File(ctx context.Context, userFileID string) (*model.UserFile, error) {
	panic("not implemented")
}

// Files is the resolver for the files field.
func (r *queryResolver) Files(ctx context.Context, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented")
}

// SearchFiles is the resolver for the searchFiles field.
func (r *queryResolver) SearchFiles(ctx context.Context, q string, filter *model.FileFilter, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented")
}

// AdminFiles is the resolver for the adminFiles field.
func (r *queryResolver) AdminFiles(ctx context.Context, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented")
}

// AdminStats is the resolver for the adminStats field.
func (r *queryResolver) AdminStats(ctx context.Context) (*model.AdminStats, error) {
	panic("not implemented")
}

// AdminDownloads is the resolver for the adminDownloads field.
func (r *queryResolver) AdminDownloads(ctx context.Context, from *time.Time, to *time.Time, limit *int, offset *int) ([]*model.DownloadRecord, error) {
	panic("not implemented")
}

// Stats is the resolver for the stats field.
func (r *queryResolver) Stats(ctx context.Context) (*model.StorageStats, error) {
	panic("not implemented")
}

// ShareByToken is the resolver for the shareByToken field.
func (r *queryResolver) ShareByToken(ctx context.Context, token string) (*model.Share, error) {
	panic("not implemented")
}

// ListShares is the resolver for the listShares field.
func (r *queryResolver) ListShares(ctx context.Context, limit *int, offset *int) ([]*model.Share, error) {
	panic("not implemented")
}

// Tags is the resolver for the tags field.
func (r *queryResolver) Tags(ctx context.Context) ([]*model.Tag, error) {
	panic("not implemented")
}

// FilesByTag is the resolver for the filesByTag field.
func (r *queryResolver) FilesByTag(ctx context.Context, tagName string, pagination *model.PaginationInput) (*model.FilePage, error) {
	panic("not implemented")
}

// Folder is the resolver for the folder field.
func (r *queryResolver) Folder(ctx context.Context, id string) (*model.Folder, error) {
	panic("not implemented")
}

// MyFolders is the resolver for the myFolders field.
func (r *queryResolver) MyFolders(ctx context.Context, limit *int, offset *int) ([]*model.Folder, error) {
	panic("not implemented")
}

// Mutation returns generated.MutationResolver implementation.
func (r *Resolver) Mutation() generated.MutationResolver { return &mutationResolver{r} }

// Query returns generated.QueryResolver implementation.
func (r *Resolver) Query() generated.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }

// !!! WARNING !!!
// The code below was going to be deleted when updating resolvers. It has been copied here so you have
// one last chance to move it out of harms way if you want. There are two reasons this happens:
//  - When renaming or deleting a resolver the old code will be put in here. You can safely delete
//    it when you're done.
//  - You have helper methods in this file. Move them out to keep these resolver files clean.
/*
	type Resolver struct{}
*/
