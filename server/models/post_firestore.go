package models

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"example.com/blog_backend/db"
)

// Post represents a blog post that users can read after logging in.
//
// Status indicates whether the post is published or still a draft. Valid
// values are "published" (default) and "draft".
type Post struct {
	ID            int64     `json:"id"`
	Title         string    `json:"title" binding:"required"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Content       string    `json:"content" binding:"required"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	AuthorID      int64     `json:"author_id"`
	LikesCount    int64     `json:"likes_count"`
	DislikesCount int64     `json:"dislikes_count"`
}

// firestorePostDoc is the Firestore representation of a Post document.
type firestorePostDoc struct {
	ID            int64     `firestore:"id"`
	Title         string    `firestore:"title"`
	Description   string    `firestore:"description"`
	Category      string    `firestore:"category"`
	Content       string    `firestore:"content"`
	Status        string    `firestore:"status"`
	CreatedAt     time.Time `firestore:"created_at"`
	UpdatedAt     time.Time `firestore:"updated_at"`
	AuthorID      int64     `firestore:"author_id"`
	LikesCount    int64     `firestore:"likes_count"`
	DislikesCount int64     `firestore:"dislikes_count"`
}

func postsCollection() *firestore.CollectionRef {
	if db.FirestoreClient == nil {
		panic("Firestore client is not initialized")
	}
	return db.FirestoreClient.Collection("posts")
}

// nextPostID returns the next numeric post ID by looking at the existing
// maximum id value in Firestore. If there are no posts yet, it returns 1.
func nextPostID(ctx context.Context) (int64, error) {
	col := postsCollection()
	iter := col.OrderBy("id", firestore.Desc).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return 1, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get last post id: %w", err)
	}

	var data firestorePostDoc
	if err := doc.DataTo(&data); err != nil {
		return 0, fmt.Errorf("failed to decode last post document: %w", err)
	}

	return data.ID + 1, nil
}

// Save creates a new post in Firestore and assigns it a numeric ID. The ID is
// stored both as a field and used as the document ID so existing API consumers
// can continue to treat post IDs as integers.
func (p *Post) Save() error {
	ctx := context.Background()

	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now()
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = p.CreatedAt
	}

	// Only allow "draft" or "published"; default to published.
	if p.Status != "draft" {
		p.Status = "published"
	}

	nextID, err := nextPostID(ctx)
	if err != nil {
		return err
	}

	doc := firestorePostDoc{
		ID:            nextID,
		Title:         p.Title,
		Description:   p.Description,
		Category:      p.Category,
		Content:       p.Content,
		Status:        p.Status,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
		AuthorID:      p.AuthorID,
		LikesCount:    0,
		DislikesCount: 0,
	}

	if _, err := postsCollection().Doc(strconv.FormatInt(nextID, 10)).Set(ctx, doc); err != nil {
		return fmt.Errorf("failed to save post: %w", err)
	}

	p.ID = nextID
	p.LikesCount = 0
	p.DislikesCount = 0

	return nil
}

// GetAllPosts returns all posts ordered by creation time (newest first).
func GetAllPosts() ([]Post, error) {
	ctx := context.Background()
	col := postsCollection()

	iter := col.OrderBy("created_at", firestore.Desc).Documents(ctx)
	defer iter.Stop()

	var posts []Post
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate posts: %w", err)
		}

		var data firestorePostDoc
		if err := doc.DataTo(&data); err != nil {
			return nil, fmt.Errorf("failed to decode post document: %w", err)
		}

		posts = append(posts, Post{
			ID:            data.ID,
			Title:         data.Title,
			Description:   data.Description,
			Category:      data.Category,
			Content:       data.Content,
			Status:        data.Status,
			CreatedAt:     data.CreatedAt,
			UpdatedAt:     data.UpdatedAt,
			AuthorID:      data.AuthorID,
			LikesCount:    data.LikesCount,
			DislikesCount: data.DislikesCount,
		})
	}

	return posts, nil
}

// GetPostByID fetches a single post by its numeric ID.
func GetPostByID(id int64) (*Post, error) {
	ctx := context.Background()

	doc, err := postsCollection().Doc(strconv.FormatInt(id, 10)).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}

	var data firestorePostDoc
	if err := doc.DataTo(&data); err != nil {
		return nil, fmt.Errorf("failed to decode post document: %w", err)
	}

	post := &Post{
		ID:            data.ID,
		Title:         data.Title,
		Description:   data.Description,
		Category:      data.Category,
		Content:       data.Content,
		Status:        data.Status,
		CreatedAt:     data.CreatedAt,
		UpdatedAt:     data.UpdatedAt,
		AuthorID:      data.AuthorID,
		LikesCount:    data.LikesCount,
		DislikesCount: data.DislikesCount,
	}

	return post, nil
}

// Update modifies an existing post's title, metadata, and content in
// Firestore.
func (p Post) Update() error {
	ctx := context.Background()

	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = time.Now()
	}

	// Only allow "draft" or "published"; default to published.
	if p.Status != "draft" {
		p.Status = "published"
	}

	docRef := postsCollection().Doc(strconv.FormatInt(p.ID, 10))
	updates := []firestore.Update{
		{Path: "title", Value: p.Title},
		{Path: "description", Value: p.Description},
		{Path: "category", Value: p.Category},
		{Path: "status", Value: p.Status},
		{Path: "content", Value: p.Content},
		{Path: "updated_at", Value: p.UpdatedAt},
	}

	if _, err := docRef.Update(ctx, updates); err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrPostNotFound
		}
		return fmt.Errorf("failed to update post: %w", err)
	}

	return nil
}

// Delete removes a post and its associated reactions from Firestore.
func (p Post) Delete() error {
	ctx := context.Background()
	client := db.FirestoreClient
	if client == nil {
		panic("Firestore client is not initialized")
	}

	// Best-effort cleanup of reactions associated with this post.
	reactionsIter := client.Collection("post_reactions").Where("post_id", "==", p.ID).Documents(ctx)
	defer reactionsIter.Stop()

	for {
		doc, err := reactionsIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to iterate reactions for deletion: %w", err)
		}

		if _, err := doc.Ref.Delete(ctx); err != nil {
			return fmt.Errorf("failed to delete reaction document: %w", err)
		}
	}

	if _, err := postsCollection().Doc(strconv.FormatInt(p.ID, 10)).Delete(ctx); err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrPostNotFound
		}
		return fmt.Errorf("failed to delete post: %w", err)
	}

	return nil
}
