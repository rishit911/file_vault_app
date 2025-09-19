package server

import (
	"net/http"
	"sync"

	"golang.org/x/time/rate"
)

type RateLimiterStore struct {
	mu sync.Mutex
	m  map[string]*rate.Limiter
	r  rate.Limit
	b  int
}

func NewRateLimiterStore(r rate.Limit, b int) *RateLimiterStore {
	return &RateLimiterStore{
		m: map[string]*rate.Limiter{},
		r: r,
		b: b,
	}
}

func (s *RateLimiterStore) Get(userID string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	if l, ok := s.m[userID]; ok {
		return l
	}

	l := rate.NewLimiter(s.r, s.b)
	s.m[userID] = l
	return l
}

func RateLimitMiddleware(store *RateLimiterStore, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserIDFromContext(r)
		if userID == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		limiter := store.Get(userID)
		if !limiter.Allow() {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}