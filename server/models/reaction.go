package models

import (
	"database/sql"
	"errors"

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

// SetPostReaction records or toggles a reaction (like or dislike) from a
// specific user on a specific post. A user can have at most one reaction per
// post; calling this function with the same reaction twice will remove the
// reaction (toggle off). It returns the up-to-date aggregate counters and the
// user's effective reaction after the change.
func SetPostReaction(userID, postID int64, reaction string) (*PostReactionResult, error) {
	if reaction != ReactionLike && reaction != ReactionDislike {
		return nil, ErrInvalidReaction
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var existingReaction string
	err = tx.QueryRow(
		"SELECT reaction FROM post_reactions WHERE user_id = ? AND post_id = ?",
		userID,
		postID,
	).Scan(&existingReaction)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// Reset err so that the deferred rollback logic does not trigger on
	// sql.ErrNoRows from the query above.
	if err == sql.ErrNoRows {
		err = nil
	}

	userReaction := ""

	if existingReaction == "" {
		// No existing reaction for this user/post; insert a new one.
		if _, err = tx.Exec(
			"INSERT INTO post_reactions (user_id, post_id, reaction) VALUES (?, ?, ?)",
			userID,
			postID,
			reaction,
		); err != nil {
			return nil, err
		}

		if reaction == ReactionLike {
			if _, err = tx.Exec(
				"UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		} else {
			if _, err = tx.Exec(
				"UPDATE posts SET dislikes_count = dislikes_count + 1 WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		}
		userReaction = reaction
	} else if existingReaction == reaction {
		// Same reaction clicked again: toggle off by deleting the row and
		// decrementing the appropriate counter.
		if _, err = tx.Exec(
			"DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?",
			userID,
			postID,
		); err != nil {
			return nil, err
		}

		if reaction == ReactionLike {
			if _, err = tx.Exec(
				"UPDATE posts SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		} else {
			if _, err = tx.Exec(
				"UPDATE posts SET dislikes_count = CASE WHEN dislikes_count > 0 THEN dislikes_count - 1 ELSE 0 END WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		}
		userReaction = ""
	} else {
		// Switch from like->dislike or dislike->like.
		if _, err = tx.Exec(
			"UPDATE post_reactions SET reaction = ? WHERE user_id = ? AND post_id = ?",
			reaction,
			userID,
			postID,
		); err != nil {
			return nil, err
		}

		if existingReaction == ReactionLike {
			if _, err = tx.Exec(
				"UPDATE posts SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END, dislikes_count = dislikes_count + 1 WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		} else {
			if _, err = tx.Exec(
				"UPDATE posts SET dislikes_count = CASE WHEN dislikes_count > 0 THEN dislikes_count - 1 ELSE 0 END, likes_count = likes_count + 1 WHERE id = ?",
				postID,
			); err != nil {
				return nil, err
			}
		}
		userReaction = reaction
	}

	var likesCount, dislikesCount int64
	err = tx.QueryRow(
		"SELECT likes_count, dislikes_count FROM posts WHERE id = ?",
		postID,
	).Scan(&likesCount, &dislikesCount)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// Clear err so the deferred rollback does not run after a successful commit.
	err = nil

	return &PostReactionResult{
		LikesCount:    likesCount,
		DislikesCount: dislikesCount,
		UserReaction:  userReaction,
	}, nil
}
