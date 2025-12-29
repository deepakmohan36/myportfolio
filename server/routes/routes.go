package routes

import (
	"example.com/blog_backend/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(server *gin.Engine) {
	// Public authentication endpoints
	server.POST("/signup", signup)
	server.POST("/login", login)
	server.POST("/login/google", googleLogin)

		// All blog post routes are behind authentication so users must log in
		// before reading or managing your blogs.
	authenticated := server.Group("/")
	authenticated.Use(middlewares.Authenticate)

			// Any authenticated user can read posts, react to them, and work with
			// comments.
	authenticated.GET("/posts", getPosts)
	authenticated.GET("/posts/:id", getPost)
	authenticated.GET("/posts/:id/comments", getPostComments)
	authenticated.POST("/posts/:id/comments", createPostComment)
	authenticated.PUT("/posts/:id/comments/:commentId", updatePostComment)
	authenticated.DELETE("/posts/:id/comments/:commentId", deletePostComment)
	authenticated.POST("/posts/:id/react", reactToPost)
			
			// Admins and editors can create, update, and delete posts.
			editorOrAdmin := authenticated.Group("/")
			editorOrAdmin.Use(middlewares.RequireEditorOrAdmin)
			editorOrAdmin.POST("/posts", createPost)
			editorOrAdmin.PUT("/posts/:id", updatePost)
			editorOrAdmin.DELETE("/posts/:id", deletePost)

			// Only admin users can manage other users.
			adminOnly := authenticated.Group("/")
			adminOnly.Use(middlewares.RequireAdmin)
			adminOnly.GET("/users", getUsers)
			adminOnly.PUT("/users/:id/role", updateUserRole)
}

