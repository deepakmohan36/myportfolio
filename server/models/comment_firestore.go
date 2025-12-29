package models

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"example.com/blog_backend/db"
)

// Comment represents a reader comment attached to a blog post.
type Comment struct {
	ID         string    `json:"id"`
	PostID     int64     `json:"post_id"`
	UserID     int64     `json:"user_id"`
	AuthorName string    `json:"author_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// firestoreCommentDoc is the Firestore representation of a Comment document.
type firestoreCommentDoc struct {
	PostID     int64     `firestore:"post_id"`
	UserID     int64     `firestore:"user_id"`
	AuthorName string    `firestore:"author_name"`
	Content    string    `firestore:"content"`
	CreatedAt  time.Time `firestore:"created_at"`
	UpdatedAt  time.Time `firestore:"updated_at"`
}

func postCommentsCollection() *firestore.CollectionRef {
	if db.FirestoreClient == nil {
		panic("Firestore client is not initialized")
	}
	return db.FirestoreClient.Collection("post_comments")
}

// CreateComment creates a new comment document for the given post and user.
func CreateComment(postID, userID int64, authorName, content string) (*Comment, error) {
	ctx := context.Background()
	now := time.Now()

	doc := firestoreCommentDoc{
		PostID:     postID,
		UserID:     userID,
		AuthorName: authorName,
		Content:    content,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	ref, _, err := postCommentsCollection().Add(ctx, doc)
	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	return &Comment{
		ID:         ref.ID,
		PostID:     postID,
		UserID:     userID,
		AuthorName: authorName,
		Content:    content,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// GetCommentsForPost returns all comments for a post ordered by creation time
// (oldest first). The API layer is responsible for choosing how many to
// display.
func GetCommentsForPost(postID int64) ([]Comment, error) {
	ctx := context.Background()
	col := postCommentsCollection()

	iter := col.Where("post_id", "==", postID).OrderBy("created_at", firestore.Asc).Documents(ctx)
	defer iter.Stop()

	var comments []Comment
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate comments: %w", err)
		}

		var data firestoreCommentDoc
		if err := doc.DataTo(&data); err != nil {
			return nil, fmt.Errorf("failed to decode comment document: %w", err)
		}

		comments = append(comments, Comment{
			ID:         doc.Ref.ID,
			PostID:     data.PostID,
			UserID:     data.UserID,
			AuthorName: data.AuthorName,
			Content:    data.Content,
			CreatedAt:  data.CreatedAt,
			UpdatedAt:  data.UpdatedAt,
		})
	}

	return comments, nil
}

// GetCommentByID fetches a single comment document by its Firestore ID.
func GetCommentByID(id string) (*Comment, error) {
	ctx := context.Background()
	doc, err := postCommentsCollection().Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, ErrCommentNotFound
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	var data firestoreCommentDoc
	if err := doc.DataTo(&data); err != nil {
		return nil, fmt.Errorf("failed to decode comment document: %w", err)
	}

	return &Comment{
		ID:         doc.Ref.ID,
		PostID:     data.PostID,
		UserID:     data.UserID,
		AuthorName: data.AuthorName,
		Content:    data.Content,
		CreatedAt:  data.CreatedAt,
		UpdatedAt:  data.UpdatedAt,
	}, nil
}

// UpdateCommentContent updates the content of a comment owned by the given
// user.
func UpdateCommentContent(id string, userID int64, newContent string) (*Comment, error) {
	ctx := context.Background()
	ref := postCommentsCollection().Doc(id)

	snap, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, ErrCommentNotFound
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	var data firestoreCommentDoc
	if err := snap.DataTo(&data); err != nil {
		return nil, fmt.Errorf("failed to decode comment document: %w", err)
	}

	if data.UserID != userID {
		return nil, ErrUnauthorizedCommentAction
	}

	data.Content = newContent
	data.UpdatedAt = time.Now()

	if _, err := ref.Update(ctx, []firestore.Update{
		{Path: "content", Value: data.Content},
		{Path: "updated_at", Value: data.UpdatedAt},
	}); err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, ErrCommentNotFound
		}
		return nil, fmt.Errorf("failed to update comment: %w", err)
	}

	return &Comment{
		ID:         ref.ID,
		PostID:     data.PostID,
		UserID:     data.UserID,
		AuthorName: data.AuthorName,
		Content:    data.Content,
		CreatedAt:  data.CreatedAt,
		UpdatedAt:  data.UpdatedAt,
	}, nil
}

// DeleteComment removes a comment document by ID.
func DeleteComment(id string) error {
	ctx := context.Background()
	if _, err := postCommentsCollection().Doc(id).Delete(ctx); err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrCommentNotFound
		}
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}

