package models

import (
	"fmt"
	"testing"
	"time"

	"example.com/blog_backend/db"
)

// Test the basic state machine for a user's reaction on a post: like,
// toggle like off, dislike, then switch back to like. At every step we
// verify that the aggregate counters reflect a single user's reaction and
// that a user can never contribute to both like and dislike at the same time.
func TestSetPostReactionSequence(t *testing.T) {
	db.InitDB()
	if db.FirestoreClient == nil {
		t.Skip("Firestore client is not initialized; skipping user-dependent reaction test")
	}

	// Create a unique user for this test.
	user := &User{
		Username: fmt.Sprintf("reaction_user_%d", time.Now().UnixNano()),
		Password: "testpassword",
	}
	if err := user.Save(); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// Create a simple post authored by this user.
	post := &Post{
		Title:   "Reaction test post",
		Content: "Hello, reactions!",
			AuthorID: user.ID,
	}
	if err := post.Save(); err != nil {
		t.Fatalf("failed to create post: %v", err)
	}

	// 1) Like the post.
	r1, err := SetPostReaction(user.ID, post.ID, ReactionLike)
	if err != nil {
		t.Fatalf("SetPostReaction like failed: %v", err)
	}
	if r1.LikesCount != 1 || r1.DislikesCount != 0 || r1.UserReaction != ReactionLike {
		t.Fatalf("unexpected state after like: %+v", r1)
	}

	// 2) Click like again (toggle off).
	r2, err := SetPostReaction(user.ID, post.ID, ReactionLike)
	if err != nil {
		t.Fatalf("SetPostReaction like toggle-off failed: %v", err)
	}
	if r2.LikesCount != 0 || r2.DislikesCount != 0 || r2.UserReaction != "" {
		t.Fatalf("unexpected state after toggling like off: %+v", r2)
	}

	// 3) Dislike the post.
	r3, err := SetPostReaction(user.ID, post.ID, ReactionDislike)
	if err != nil {
		t.Fatalf("SetPostReaction dislike failed: %v", err)
	}
	if r3.LikesCount != 0 || r3.DislikesCount != 1 || r3.UserReaction != ReactionDislike {
		t.Fatalf("unexpected state after dislike: %+v", r3)
	}

	// 4) Switch from dislike to like.
	r4, err := SetPostReaction(user.ID, post.ID, ReactionLike)
	if err != nil {
		t.Fatalf("SetPostReaction switch to like failed: %v", err)
	}
	if r4.LikesCount != 1 || r4.DislikesCount != 0 || r4.UserReaction != ReactionLike {
		t.Fatalf("unexpected state after switching to like: %+v", r4)
	}
}

// Test that using an invalid reaction string is rejected with
// ErrInvalidReaction.
func TestSetPostReactionInvalidType(t *testing.T) {
	db.InitDB()

	if _, err := SetPostReaction(123, 456, "invalid"); err == nil {
		t.Fatalf("expected error for invalid reaction type, got nil")
	} else if err != ErrInvalidReaction {
		t.Fatalf("expected ErrInvalidReaction, got %v", err)
	}
}
