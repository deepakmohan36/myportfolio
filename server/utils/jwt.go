package utils

import (
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// jwtSecret holds the HMAC signing key for JWTs. It is loaded from the
// JWT_SECRET environment variable when the utils package is initialized.
//
// This allows you to keep the secret in a local .env file or environment
	// configuration instead of hard-coding it in source. The process will exit
	// on startup if JWT_SECRET is not set, to avoid accidentally running with
	// an insecure default in production.
	var jwtSecret = getJWTSecret()

	const (
		// sessionTokenTTL controls how long a normal login session token remains
		// valid. This is intentionally set to a full day so readers don't lose
		// access midway through reading longer posts.
		sessionTokenTTL = 24 * time.Hour

		// rememberMeTokenTTL controls how long the optional "keep me signed in"
		// token remains valid. This token is only ever sent back to the server to
		// mint a fresh short-lived session token and is not used directly for API
		// access.
		rememberMeTokenTTL = 30 * 24 * time.Hour
	)

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable is not set")
	}
	return secret
}

func GenerateJWTToken(username string, userId int64, role string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": username,
		"userId":  userId,
		"role":    role,
		"exp":     time.Now().Add(sessionTokenTTL).Unix(),
	})

	return token.SignedString([]byte(jwtSecret))
}

func VerifyJWTToken(token string) (int64, string, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		_, ok := token.Method.(*jwt.SigningMethodHMAC)
		if !ok {
			return nil, errors.New("Unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return 0, "", errors.New("Could Not parse the token")
	}

	if !parsedToken.Valid {
		return 0, "", errors.New("Invalid token")
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", errors.New("Could not get claims from token")
	}

	userId, err := extractUserIDFromClaims(claims)
	if err != nil {
		return 0, "", err
	}

	roleVal, _ := claims["role"]
	role, _ := roleVal.(string)

	return userId, role, nil
}

func extractUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
	// Safely extract userId from claims without panicking on malformed tokens.
	userIDVal, ok := claims["userId"]
	if !ok {
		return 0, errors.New("userId claim is missing")
	}

	switch v := userIDVal.(type) {
	case float64:
		return int64(v), nil
	case int64:
		return v, nil
	default:
		return 0, errors.New("userId claim has unexpected type")
	}
}

// GenerateRememberMeToken issues a long-lived token that can be used to mint a
// new short-lived session token without re-entering credentials. It contains
// only the user ID and an explicit "remember_me" scope.
func GenerateRememberMeToken(userId int64) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userId,
		"exp":    time.Now().Add(rememberMeTokenTTL).Unix(),
		"scope":  "remember_me",
	})

	return token.SignedString([]byte(jwtSecret))
}

// VerifyRememberMeToken validates a remember-me token and returns the embedded
// user ID when successful.
func VerifyRememberMeToken(token string) (int64, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		_, ok := token.Method.(*jwt.SigningMethodHMAC)
		if !ok {
			return nil, errors.New("Unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return 0, errors.New("Could Not parse the token")
	}

	if !parsedToken.Valid {
		return 0, errors.New("Invalid token")
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("Could not get claims from token")
	}

	if scope, _ := claims["scope"].(string); scope != "remember_me" {
		return 0, errors.New("Invalid token")
	}

	userId, err := extractUserIDFromClaims(claims)
	if err != nil {
		return 0, err
	}

	return userId, nil
}