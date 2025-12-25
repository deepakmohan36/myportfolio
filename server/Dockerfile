## Build stage
FROM golang:1.25.5 AS builder

WORKDIR /app

# Download dependencies first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source
COPY . .

# Build Linux binary with CGO enabled so go-sqlite3 works
RUN go build -o server .


## Runtime stage
# Use a small Debian base image that has glibc; install SQLite runtime
# library and CA certificates for Firestore HTTPS.
FROM debian:12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         ca-certificates \
         libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder stage
COPY --from=builder /app/server .

# Default SQLite path inside containers/Cloud Run; can be overridden
# with SQLITE_DB_PATH env var if needed.
ENV PORT=8080 \
    SQLITE_DB_PATH=/tmp/api.db

EXPOSE 8080

CMD ["./server"]

