package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"example.com/blog_backend/db"
	"github.com/gin-gonic/gin"
)

// Test that signing up with a duplicate username returns HTTP 409 Conflict
// instead of a generic 500 Internal Server Error.
func TestSignupDuplicateUsernameReturnsConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Ensure the database is initialised for the test.
	db.InitDB()
	if db.FirestoreClient == nil {
		t.Skip("Firestore client is not initialized; skipping signup duplicate username test")
	}

	router := gin.Default()
	router.POST("/signup", signup)

	username := fmt.Sprintf("dupuser_%d", time.Now().UnixNano())

	body := map[string]string{
		"username": username,
		"password": "testpassword",
	}
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("failed to marshal request body: %v", err)
	}

	// First signup should succeed.
	req1 := httptest.NewRequest(http.MethodPost, "/signup", bytes.NewReader(payload))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("expected status %d for first signup, got %d; body=%s", http.StatusCreated, w1.Code, w1.Body.String())
	}

	// Second signup with the same username should return conflict.
	req2 := httptest.NewRequest(http.MethodPost, "/signup", bytes.NewReader(payload))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusConflict {
		t.Fatalf("expected status %d for duplicate signup, got %d; body=%s", http.StatusConflict, w2.Code, w2.Body.String())
	}
}

