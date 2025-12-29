package main

import (
	"context"
	"log"

	"example.com/blog_backend/db"
	"example.com/blog_backend/middlewares"
	"example.com/blog_backend/routes"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize datastore (currently a no-op; posts and reactions are Firestore-backed).
	db.InitDB()

	// Initialize Firestore for user authentication and user management.
	ctx := context.Background()
	if err := db.InitFirestore(ctx); err != nil {
		log.Fatalf("failed to initialize Firestore: %v", err)
	}

	server := gin.Default() // create a new gin server instance with default middleware (logger and recovery)
	server.Use(middlewares.CORS()) // enable CORS for frontend communication
	routes.RegisterRoutes(server)  // register routes from routes package
	server.Run(":8080")          // listen and serve on 0.0.0.0:8080
}
