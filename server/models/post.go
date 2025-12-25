package models

import (
	"time"

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

// Save inserts a new post into the database and sets its ID. The main posts
// table stores metadata, while the Markdown body is stored in the
// post_contents table as version 1 so we can support revisions later.
func (p *Post) Save() error {
	// Set timestamps if not already set
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

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}

		stmt, err := tx.Prepare(`
			INSERT INTO posts (title, description, category, status, created_at, updated_at, author_id)
			VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

		result, err := stmt.Exec(p.Title, p.Description, p.Category, p.Status, p.CreatedAt, p.UpdatedAt, p.AuthorID)
	if err != nil {
		tx.Rollback()
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		tx.Rollback()
		return err
	}
	p.ID = id

	// Store the Markdown body in the post_contents table as version 1.
	if _, err = tx.Exec(`
		INSERT INTO post_contents (post_id, version, body_markdown, created_at)
		VALUES (?, 1, ?, ?)
	`, p.ID, p.Content, p.UpdatedAt); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

	// GetAllPosts returns all posts from the database ordered by creation time
	// (newest first). Content is loaded from the latest version in post_contents.
func GetAllPosts() ([]Post, error) {
	query := `
		SELECT
			p.id,
			p.title,
			p.description,
			p.category,
				pc.body_markdown AS content,
			p.status,
			p.created_at,
			p.updated_at,
			p.author_id,
			p.likes_count,
			p.dislikes_count
		FROM posts p
		LEFT JOIN post_contents pc
			ON pc.post_id = p.id
			AND pc.version = (
				SELECT MAX(version) FROM post_contents WHERE post_id = p.id
			)
		ORDER BY p.created_at DESC`
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		if err := rows.Scan(
			&post.ID,
			&post.Title,
			&post.Description,
			&post.Category,
			&post.Content,
			&post.Status,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.AuthorID,
			&post.LikesCount,
			&post.DislikesCount,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

	// GetPostByID fetches a single post by its ID. Content is loaded from the
	// latest version in post_contents.
func GetPostByID(id int64) (*Post, error) {
	query := `
		SELECT
			p.id,
				p.title,
				p.description,
				p.category,
				pc.body_markdown AS content,
			p.status,
			p.created_at,
			p.updated_at,
			p.author_id,
			p.likes_count,
			p.dislikes_count
		FROM posts p
		LEFT JOIN post_contents pc
			ON pc.post_id = p.id
			AND pc.version = (
				SELECT MAX(version) FROM post_contents WHERE post_id = p.id
			)
		WHERE p.id = ?`
	row := db.DB.QueryRow(query, id)

	var post Post
	if err := row.Scan(
		&post.ID,
		&post.Title,
		&post.Description,
		&post.Category,
		&post.Content,
		&post.Status,
		&post.CreatedAt,
		&post.UpdatedAt,
		&post.AuthorID,
		&post.LikesCount,
		&post.DislikesCount,
	); err != nil {
		return nil, err
	}

	return &post, nil
}

	// Update modifies an existing post's title and metadata, and creates a new
	// content version in post_contents.
func (p Post) Update() error {
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = time.Now()
	}

	// Only allow "draft" or "published"; default to published.
	if p.Status != "draft" {
		p.Status = "published"
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}

		stmt, err := tx.Prepare(`
			UPDATE posts
				SET title = ?, description = ?, category = ?, status = ?, updated_at = ?
			WHERE id = ?`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

		if _, err = stmt.Exec(p.Title, p.Description, p.Category, p.Status, p.UpdatedAt, p.ID); err != nil {
		tx.Rollback()
		return err
	}

	// Compute the next content version for this post.
	var currentMaxVersion int
	row := tx.QueryRow(`SELECT COALESCE(MAX(version), 0) FROM post_contents WHERE post_id = ?`, p.ID)
	if err := row.Scan(&currentMaxVersion); err != nil {
		tx.Rollback()
		return err
	}
	nextVersion := currentMaxVersion + 1

	if _, err := tx.Exec(`
		INSERT INTO post_contents (post_id, version, body_markdown, created_at)
		VALUES (?, ?, ?, ?)
	`, p.ID, nextVersion, p.Content, p.UpdatedAt); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// Delete removes a post from the database.
func (p Post) Delete() error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}

	if _, err := tx.Exec(`DELETE FROM post_contents WHERE post_id = ?`, p.ID); err != nil {
		tx.Rollback()
		return err
	}

	if _, err := tx.Exec(`DELETE FROM posts WHERE id = ?`, p.ID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
