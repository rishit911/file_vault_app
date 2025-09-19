package graph

import (
	"github.com/99designs/gqlgen/graphql"
)

// Temporary stub to make compilation work
func NewExecutableSchema(cfg Config) graphql.ExecutableSchema {
	return nil
}

type Config struct {
	Resolvers interface{}
}