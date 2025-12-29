package models

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"example.com/blog_backend/db"
)

// ErrInvalidReaction is returned when a caller tries to set a reaction type
// other than "like" or "dislike".
var ErrInvalidReaction = errors.New("invalid reaction type")

const (
	ReactionLike    = "like"
	ReactionDislike = "dislike"
)

// PostReactionResult represents the outcome of updating a user's reaction
// for a given post, including the aggregate like/dislike counters.
type PostReactionResult struct {
	LikesCount    int64  `json:"likes_count"`
	DislikesCount int64  `json:"dislikes_count"`
	UserReaction  string `json:"user_reaction"`
}

// firestorePostReactionDoc is the Firestore representation of a post reaction.
type firestorePostReactionDoc struct {
	UserID   int64  `firestore:"user_id"`
	PostID   int64  `firestore:"post_id"`
	Reaction string `firestore:"reaction"`
}

func postReactionsCollection() *firestore.CollectionRef {
	if db.FirestoreClient == nil {
		panic("Firestore client is not initialized")
	}
	return db.FirestoreClient.Collection("post_reactions")
}

// SetPostReaction records or toggles a reaction (like or dislike) from a
// specific user on a specific post. A user can have at most one reaction per
// post; calling this function with the same reaction twice will remove the
// reaction (toggle off). It returns the up-to-date aggregate counters and the
// user's effective reaction after the change.
func SetPostReaction(userID, postID int64, reaction string) (*PostReactionResult, error) {
	if reaction != ReactionLike && reaction != ReactionDislike {
		return nil, ErrInvalidReaction
	}

	client := db.FirestoreClient
	if client == nil {
		return nil, fmt.Errorf("Firestore client is not initialized")
	}

	ctx := context.Background()
	postRef := postsCollection().Doc(strconv.FormatInt(postID, 10))
	reactionRef := postReactionsCollection().Doc(fmt.Sprintf("%d_%d", userID, postID))

	var result *PostReactionResult

	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Load the current post document to read and update the counters.
		postSnap, err := tx.Get(postRef)
		if err != nil {
			if status.Code(err) == codes.NotFound {
				return ErrPostNotFound
			}
			return fmt.Errorf("failed to load post in reaction transaction: %w", err)
		}

		var postDoc firestorePostDoc
		if err := postSnap.DataTo(&postDoc); err != nil {
			return fmt.Errorf("failed to decode post document: %w", err)
		}

		// Load any existing reaction for this user/post pair.
		existingReaction := ""
		reactionSnap, err := tx.Get(reactionRef)
		if err != nil {
			if status.Code(err) != codes.NotFound {
				return fmt.Errorf("failed to load reaction in transaction: %w", err)
			}
		} else {
			var rdoc firestorePostReactionDoc
			if err := reactionSnap.DataTo(&rdoc); err != nil {
				return fmt.Errorf("failed to decode reaction document: %w", err)
			}
			existingReaction = rdoc.Reaction
		}

		userReaction := ""

		switch {
		case existingReaction == "":
			// No existing reaction for this user/post; insert a new one.
			rdoc := firestorePostReactionDoc{
				UserID:   userID,
				PostID:   postID,
				Reaction: reaction,
			}
			if err := tx.Set(reactionRef, rdoc); err != nil {
				return fmt.Errorf("failed to create reaction document: %w", err)
			}

			if reaction == ReactionLike {
				postDoc.LikesCount++
			} else {
				postDoc.DislikesCount++
			}
			userReaction = reaction

		case existingReaction == reaction:
			// Same reaction clicked again: toggle off by deleting the document and
			// decrementing the appropriate counter.
			if err := tx.Delete(reactionRef); err != nil {
				return fmt.Errorf("failed to delete reaction document: %w", err)
			}

			if reaction == ReactionLike {
				if postDoc.LikesCount > 0 {
					postDoc.LikesCount--
				}
			} else {
				if postDoc.DislikesCount > 0 {
					postDoc.DislikesCount--
				}
			}
			userReaction = ""

		default:
			// Switch from like->dislike or dislike->like.
			if err := tx.Update(reactionRef, []firestore.Update{{Path: "reaction", Value: reaction}}); err != nil {
				return fmt.Errorf("failed to update reaction document: %w", err)
			}

			if existingReaction == ReactionLike {
				if postDoc.LikesCount > 0 {
					postDoc.LikesCount--
				}
				postDoc.DislikesCount++
			} else {
				if postDoc.DislikesCount > 0 {
					postDoc.DislikesCount--
				}
				postDoc.LikesCount++
			}
			userReaction = reaction
		}

		// Persist the updated aggregate counters on the post document.
		if err := tx.Update(postRef, []firestore.Update{
			{Path: "likes_count", Value: postDoc.LikesCount},
			{Path: "dislikes_count", Value: postDoc.DislikesCount},
		}); err != nil {
			return fmt.Errorf("failed to update post reaction counters: %w", err)
		}

		result = &PostReactionResult{
			LikesCount:    postDoc.LikesCount,
			DislikesCount: postDoc.DislikesCount,
			UserReaction:  userReaction,
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}
