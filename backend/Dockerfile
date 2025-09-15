FROM golang:1.20-alpine AS builder

WORKDIR /src
COPY . .
RUN go build -o /server ./cmd/server

FROM alpine:3.18

WORKDIR /app
COPY --from=builder /server /server

ENV PORT=8080
EXPOSE 8080

CMD ["/server"]