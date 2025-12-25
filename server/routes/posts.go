package routes

import (
	"net/http"
	"strconv"

	"example.com/blog_backend/models"
	"github.com/gin-gonic/gin"
)

	// getPosts returns blog posts. This handler is meant to be used behind
	// authentication so that users log in before reading your blogs.
	//
	// Non-privileged users (regular readers) will only see published posts,
	// while admins and editors can see both published posts and drafts.
func getPosts(context *gin.Context) {
	posts, err := models.GetAllPosts()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve posts"})
		return
	}

		roleValue, _ := context.Get("role")
		role, _ := roleValue.(string)
	
		// If the caller is not an admin or editor, hide draft posts.
		if role != "admin" && role != "editor" {
		filtered := make([]models.Post, 0, len(posts))
		for _, p := range posts {
			if p.Status == "" || p.Status == "published" {
				filtered = append(filtered, p)
			}
		}
		posts = filtered
	}

	context.JSON(http.StatusOK, posts)
}

// reactToPost allows an authenticated user to like or dislike a post. A user
// can either like or dislike a post, not both. Clicking the same reaction
// twice will remove the reaction (toggle off).
func reactToPost(c *gin.Context) {
	postIDStr := c.Param("id")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil || postID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid post id"})
		return
	}

	// Ensure the post exists first so we can return a 404 if needed.
	if _, err := models.GetPostByID(postID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Post not found"})
		return
	}

	var body struct {
		Reaction string `json:"reaction"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse request body"})
		return
	}

	userID := c.GetInt64("userId")

	result, err := models.SetPostReaction(userID, postID, body.Reaction)
	if err != nil {
		if err == models.ErrInvalidReaction {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid reaction. Use 'like' or 'dislike'."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update reaction. Try again later."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"likes_count":    result.LikesCount,
		"dislikes_count": result.DislikesCount,
		"user_reaction":  result.UserReaction,
	})
}

// getPost returns a single blog post by ID.
func getPost(context *gin.Context) {
	postID, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse post ID"})
		return
	}

	post, err := models.GetPostByID(postID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve post"})
		return
	}

		// Non-privileged users should not be able to retrieve draft posts, even by ID.
		roleValue, _ := context.Get("role")
		role, _ := roleValue.(string)
		if role != "admin" && role != "editor" && post.Status == "draft" {
		context.JSON(http.StatusNotFound, gin.H{"message": "Post not found"})
		return
	}

	context.JSON(http.StatusOK, post)
}

// createPost allows an authenticated user to create a new blog post.
func createPost(context *gin.Context) {
	var post models.Post
	if err := context.ShouldBindJSON(&post); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse request body"})
		return
	}

	authorID := context.GetInt64("userId")
	post.AuthorID = authorID

	if err := post.Save(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create post. Try again later."})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Post created successfully", "post": post})
}

// updatePost allows admins to update any post, and editors to update only
// their own posts. Regular readers cannot update posts.
func updatePost(context *gin.Context) {
	postID, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse post ID"})
		return
	}

		userID := context.GetInt64("userId")
		post, err := models.GetPostByID(postID)
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch post"})
			return
		}

		roleValue, _ := context.Get("role")
		role, _ := roleValue.(string)

		// Admins can update any post. Editors can only update their own posts.
		// Regular users are not allowed to update posts at all.
		if role == "editor" && post.AuthorID != userID {
			context.JSON(http.StatusUnauthorized, gin.H{"message": "You are not authorized to update this post"})
			return
		}
		if role != "admin" && role != "editor" {
			context.JSON(http.StatusForbidden, gin.H{"message": "You are not allowed to update posts"})
			return
		}

	var updatedPost models.Post
	if err := context.ShouldBindJSON(&updatedPost); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse request body"})
		return
	}

	updatedPost.ID = postID
	updatedPost.AuthorID = post.AuthorID

	if err := updatedPost.Update(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update post"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Post updated successfully", "post": updatedPost})
}

// deletePost allows admins to delete any post, and editors to delete only
// their own posts. Regular readers cannot delete posts.
func deletePost(context *gin.Context) {
	postID, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse post ID"})
		return
	}

		userID := context.GetInt64("userId")
		post, err := models.GetPostByID(postID)
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch post"})
			return
		}

		roleValue, _ := context.Get("role")
		role, _ := roleValue.(string)

		// Admins can delete any post. Editors can only delete their own posts.
		// Regular users are not allowed to delete posts at all.
		if role == "editor" && post.AuthorID != userID {
			context.JSON(http.StatusUnauthorized, gin.H{"message": "You are not authorized to delete this post"})
			return
		}
		if role != "admin" && role != "editor" {
			context.JSON(http.StatusForbidden, gin.H{"message": "You are not allowed to delete posts"})
			return
		}

	if err := post.Delete(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete the post"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}
