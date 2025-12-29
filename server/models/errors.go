package models

import "errors"

// Domain-level error values shared across storage implementations.
var (
    // ErrPostNotFound is returned when a post with the requested ID does not
    // exist in the underlying datastore.
    ErrPostNotFound = errors.New("post not found")
)

