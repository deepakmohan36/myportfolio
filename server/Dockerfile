## Build stage
FROM golang:1.25.5 AS builder

WORKDIR /app

# Download dependencies first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source
COPY . .

# Build Linux binary
RUN go build -o server .


## Runtime stage
# Use a small Debian base image with glibc and CA certificates for Firestore HTTPS.
FROM debian:12-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	     ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy binary from builder stage
COPY --from=builder /app/server .

ENV PORT=8080

EXPOSE 8080

CMD ["./server"]

