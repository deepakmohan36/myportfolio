package models

import "errors"

// Domain-level error values shared across storage implementations.
var (
	// ErrPostNotFound is returned when a post with the requested ID does not
	// exist in the underlying datastore.
	ErrPostNotFound = errors.New("post not found")

	// ErrCommentNotFound is returned when a comment document cannot be found.
	ErrCommentNotFound = errors.New("comment not found")

	// ErrUnauthorizedCommentAction is returned when a user attempts to modify a
	// comment they do not own.
	ErrUnauthorizedCommentAction = errors.New("unauthorized comment action")
)

