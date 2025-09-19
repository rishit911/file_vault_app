# Stage 1: build
FROM golang:1.21-alpine AS builder

# install git and ca-certificates for module download
RUN apk add --no-cache git ca-certificates

WORKDIR /src
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://proxy.golang.org,direct
RUN go mod download

# Copy everything and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /server ./cmd/server

# Stage 2: runtime
FROM alpine:3.18
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# copy server binary
COPY --from=builder /server /server

# create storage dir
RUN mkdir -p /data/files && chmod 755 /data/files

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget --spider --quiet http://127.0.0.1:${PORT}/health || exit 1

USER 65532:65532

ENTRYPOINT ["/server"]