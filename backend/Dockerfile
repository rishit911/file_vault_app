# Stage 1: build
FROM golang:1.24-alpine AS builder

# install tools needed for 'go mod download' (git, ssh for private repos, certs)
RUN apk add --no-cache git openssh-client ca-certificates bash

WORKDIR /src

# copy only go.mod/go.sum to leverage Docker layer caching
COPY go.mod go.sum ./

# set a reliable GOPROXY
ENV GOPROXY=https://proxy.golang.org,direct

# Ensure we have up-to-date tooling and perform tidy+download.
# Retry download with GOSUMDB=off if the first download fails.
RUN set -eux; \
    go env; \
    go version; \
    go mod tidy; \
    if go mod download; then echo "modules downloaded"; \
    else echo "go mod download failed — retrying with GOSUMDB=off"; GOSUMDB=off go mod download; fi

# Copy rest of project and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# Stage 2: runtime image
FROM alpine:3.18
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /server /server

RUN mkdir -p /data/files && chmod 755 /data/files

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget --spider --quiet http://127.0.0.1:${PORT}/health || exit 1

# use non-root user
USER 65532:65532

ENTRYPOINT ["/server"]