package routes

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"example.com/blog_backend/models"
	"example.com/blog_backend/utils"
	"github.com/gin-gonic/gin"
)

func signup(context *gin.Context) {
	var user models.User
	if err := context.ShouldBindJSON(&user); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not bind JSON", "error": err.Error()})
		return
	}

	if err := user.Save(); err != nil {
		if errors.Is(err, models.ErrUserAlreadyExists) {
			context.JSON(http.StatusConflict, gin.H{"message": "Username already exists"})
			return
		}

		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create User. Try again later.", "error": err.Error()})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func getUsers(context *gin.Context) {
	users, err := models.GetAllUsers()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}
	context.JSON(200, users) // return users as JSON response by gin package
}

// updateUserRole allows an admin to promote or demote users between the
// "admin" and "user" roles. It is expected to be mounted behind both the
// Authenticate and RequireAdmin middlewares.
func updateUserRole(context *gin.Context) {
	userIDParam := context.Param("id")
	userID, err := strconv.ParseInt(userIDParam, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}

	var payload struct {
		Role string `json:"role"`
	}
	if err := context.ShouldBindJSON(&payload); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not bind JSON"})
		return
	}

	if err := models.UpdateUserRole(userID, payload.Role); err != nil {
		if errors.Is(err, models.ErrUserNotFound) {
			context.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
			return
		}
		if errors.Is(err, models.ErrInvalidRole) {
			context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid role"})
			return
		}
		if errors.Is(err, models.ErrCannotDemoteLastAdmin) {
			context.JSON(http.StatusBadRequest, gin.H{"message": "Cannot demote the last admin user"})
			return
		}

		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update user role", "error": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Role updated successfully"})
}

func login(context *gin.Context) {
	var payload struct {
		Username   string `json:"username" binding:"required"`
		Password   string `json:"password" binding:"required"`
		RememberMe bool   `json:"rememberMe"`
	}

	if err := context.ShouldBindJSON(&payload); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not bind JSON"})
		return
	}

	user := models.User{
		Username: payload.Username,
		Password: payload.Password,
	}

	if err := user.ValidateCredentials(); err != nil {
		if errors.Is(err, models.ErrUserNotFound) {
			context.JSON(http.StatusUnauthorized, gin.H{"message": "User does not exist. Please sign up as a new user."})
			return
		}
		if errors.Is(err, models.ErrInvalidCredentials) {
			context.JSON(http.StatusUnauthorized, gin.H{"message": "Incorrect password. Please try again."})
			return
		}
		// For any other error coming from credential validation (for example, an
		// unexpected database error), log the detailed error on the server and
		// return a 500 with a generic message to avoid leaking internals.
		log.Printf("login: unexpected error validating credentials: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
		return
	}

	token, err := utils.GenerateJWTToken(user.Username, user.ID, user.Role)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
		return
	}

	response := gin.H{
		"message":  "User authenticated successfully",
		"token":    token,
		"userId":   user.ID,
		"username": user.Username,
		"role":     user.Role,
	}

	if payload.RememberMe {
		rememberToken, err := utils.GenerateRememberMeToken(user.ID)
		if err != nil {
			log.Printf("login: failed to generate remember-me token: %v", err)
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
			return
		}
		response["rememberToken"] = rememberToken
	}

	context.JSON(http.StatusOK, response)
}

// googleLogin allows clients to exchange a Google ID token (obtained via the
// Google Identity Services JavaScript library on the frontend) for a local JWT
// that works with the existing authentication middleware.
func googleLogin(context *gin.Context) {
	var payload struct {
		IDToken    string `json:"idToken"`
		RememberMe bool   `json:"rememberMe"`
	}

	if err := context.ShouldBindJSON(&payload); err != nil || payload.IDToken == "" {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid Google login payload"})
		return
	}

	email, sub, name, picture, err := utils.VerifyGoogleIDToken(context.Request.Context(), payload.IDToken)
	if err != nil {
		// Log the detailed error on the server for observability, but return a
		// generic message to the client.
		log.Printf("googleLogin: failed to verify Google ID token: %v", err)
		context.JSON(http.StatusUnauthorized, gin.H{"message": "Could not authenticate with Google"})
		return
	}

	user, err := models.FindOrCreateUserByEmail(email, sub)
	if err != nil {
		// Log the underlying error so we can diagnose Firestore or model issues
		// without exposing internal details to the client.
		log.Printf("googleLogin: FindOrCreateUserByEmail(%q) failed: %v", email, err)
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create or find user for Google account"})
		return
	}

	displayName := user.Username
	if name != "" {
		displayName = name
	}
	avatarURL := picture

	token, err := utils.GenerateJWTToken(displayName, user.ID, user.Role)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
		return
	}

	response := gin.H{
		"message":   "User authenticated via Google",
		"token":     token,
		"userId":    user.ID,
		"username":  displayName,   // what the UI should show (Google display name when available)
		"email":     user.Username, // canonical login identifier (email for Google accounts)
		"avatarUrl": avatarURL,     // Google profile photo URL, if provided
		"role":      user.Role,
	}

	if payload.RememberMe {
		rememberToken, err := utils.GenerateRememberMeToken(user.ID)
		if err != nil {
			log.Printf("googleLogin: failed to generate remember-me token: %v", err)
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
			return
		}
		response["rememberToken"] = rememberToken
	}

	context.JSON(http.StatusOK, response)
}

// rememberLogin allows a client that holds a long-lived "remember me" token to
// obtain a fresh short-lived JWT without re-entering credentials.
func rememberLogin(context *gin.Context) {
	var payload struct {
		RememberToken string `json:"rememberToken"`
	}

	if err := context.ShouldBindJSON(&payload); err != nil || payload.RememberToken == "" {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid remember-me payload"})
		return
	}

	userID, err := utils.VerifyRememberMeToken(payload.RememberToken)
	if err != nil {
		log.Printf("rememberLogin: failed to verify remember-me token: %v", err)
		context.JSON(http.StatusUnauthorized, gin.H{"message": "Could not authenticate user"})
		return
	}

	user, err := models.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, models.ErrUserNotFound) {
			context.JSON(http.StatusUnauthorized, gin.H{"message": "Could not authenticate user"})
			return
		}

		log.Printf("rememberLogin: GetUserByID(%d) failed: %v", userID, err)
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
		return
	}

	token, err := utils.GenerateJWTToken(user.Username, user.ID, user.Role)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not authenticate user"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message":  "User authenticated from remember-me token",
		"token":    token,
		"userId":   user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}