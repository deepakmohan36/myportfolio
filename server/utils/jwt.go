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
		"exp":     time.Now().Add(time.Hour * 2).Unix(),
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

	// Safely extract userId from claims without panicking on malformed tokens.
	userIDVal, ok := claims["userId"]
	if !ok {
		return 0, "", errors.New("userId claim is missing")
	}

	var userId int64
	switch v := userIDVal.(type) {
	case float64:
		userId = int64(v)
	case int64:
		userId = v
	default:
		return 0, "", errors.New("userId claim has unexpected type")
	}

	roleVal, _ := claims["role"]
	role, _ := roleVal.(string)

	return userId, role, nil
}