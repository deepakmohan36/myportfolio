package models

import (
	"fmt"
	"testing"
	"time"

	"example.com/blog_backend/db"
)

// Verify that creating and deleting comments keeps the aggregate
// Post.CommentsCount field in sync.
func TestCommentsCountAggregates(t *testing.T) {
	// Initialize the database. If Firestore is not configured for this
	// environment (for example in local CI without credentials), skip.
	db.InitDB()
	if db.FirestoreClient == nil {
		t.Skip("Firestore client is not initialized; skipping comments count test")
	}

	// Create a unique user for this test.
	user := &User{
		Username: fmt.Sprintf("comment_user_%d", time.Now().UnixNano()),
		Password: "testpassword",
	}
	if err := user.Save(); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// Create a simple post authored by this user.
	post := &Post{
		Title:   "Comments count test post",
		Content: "Hello, comments!",
		AuthorID: user.ID,
	}
	if err := post.Save(); err != nil {
		t.Fatalf("failed to create post: %v", err)
	}

	// New posts should start with zero comments.
	fresh, err := GetPostByID(post.ID)
	if err != nil {
		t.Fatalf("failed to reload post: %v", err)
	}
	if fresh.CommentsCount != 0 {
		t.Fatalf("expected CommentsCount to start at 0, got %d", fresh.CommentsCount)
	}

	// Add a single comment.
	comment, err := CreateComment(post.ID, user.ID, user.Username, "First!")
	if err != nil {
		t.Fatalf("failed to create comment: %v", err)
	}

	// After creating one comment, the aggregate counter should be 1.
	afterCreate, err := GetPostByID(post.ID)
	if err != nil {
		t.Fatalf("failed to reload post after creating comment: %v", err)
	}
	if afterCreate.CommentsCount != 1 {
		t.Fatalf("expected CommentsCount to be 1 after create, got %d", afterCreate.CommentsCount)
	}

	// Delete the comment and verify the counter returns to 0.
	if err := DeleteComment(comment.ID, post.ID); err != nil {
		t.Fatalf("failed to delete comment: %v", err)
	}
	afterDelete, err := GetPostByID(post.ID)
	if err != nil {
		t.Fatalf("failed to reload post after deleting comment: %v", err)
	}
	if afterDelete.CommentsCount != 0 {
		t.Fatalf("expected CommentsCount to be 0 after delete, got %d", afterDelete.CommentsCount)
	}
}

