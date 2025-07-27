#======= Builder ==========
FROM golang:1.24.4-alpine AS builder


RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux  go build \
    -a -installsuffix cgo \
    -ldflags='-w -s -extldflags "-static"' \
    -o main ./cmd


#======= Development stage =======

FROM golang:1.24.4-alpine AS development

# Install air for hot reloading and delve for debugging
RUN go install github.com/air-verse/air@latest && \
    go install github.com/go-delve/delve/cmd/dlv@latest


RUN apk add --no-cache git ca-certificates curl

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download


COPY . .

# Expose debug port
EXPOSE 2345

# Development command (overridden by docker-compose)
CMD ["go", "run", "./cmd"]


#=== Production stage ===

FROM alpine:latest AS production


RUN apk --no-cache add ca-certificates tzdata wget curl

# Create app user and group
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup


WORKDIR /app

COPY --from=builder /app/main .
# COPY --from=builder /app/configs ./configs/
# COPY --from=builder /app/migrations ./migrations/
# COPY --from=builder /app/templates ./templates/
# COPY --from=builder /app/static ./static/

RUN mkdir -p /app/logs /app/uploads /app/tmp && \
    chown -R appuser:appgroup /app

# Switch to app user
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1


CMD ["./main"]
