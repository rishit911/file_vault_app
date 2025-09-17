FROM golang:1.21-alpine AS builder

WORKDIR /src
COPY . .
RUN go mod download
RUN go build -o /server ./cmd/server

FROM alpine:3.18

RUN apk --no-cache add ca-certificates
WORKDIR /app

COPY --from=builder /server /app/server

ENV PORT=8080
EXPOSE 8080

CMD ["./server"]