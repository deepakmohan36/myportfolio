package models

import (
	"context"
	"errors"
	"fmt"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"

	"example.com/blog_backend/db"
	"example.com/blog_backend/utils"
)

// User represents an application user. The ID field is a numeric identifier
// that is also used in JWTs and for relationships to posts/reactions.
type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password,omitempty" binding:"required"`
	Role     string `json:"role"`
}

var (
	// ErrUserNotFound is returned when no user exists for the given lookup.
	ErrUserNotFound = errors.New("user not found")

	// ErrCannotDemoteLastAdmin protects against demoting the last remaining
	// admin user in the system.
	ErrCannotDemoteLastAdmin = errors.New("cannot demote the last admin user")

	// ErrInvalidRole is returned when attempting to set a role that is not one
	// of the supported values (admin, editor, user).
	ErrInvalidRole = errors.New("invalid role")

	// ErrInvalidCredentials is returned when username or password is incorrect
	// during login.
	ErrInvalidCredentials = errors.New("invalid credentials")

	// ErrUserAlreadyExists indicates that a user with the same username already
	// exists.
	ErrUserAlreadyExists = errors.New("user already exists")
)

// firestoreUserDoc is the Firestore representation of a user document.
type firestoreUserDoc struct {
	ID           int64  `firestore:"id"`
	Username     string `firestore:"username"`
	PasswordHash string `firestore:"password_hash"`
	Role         string `firestore:"role"`
}

func usersCollection() *firestore.CollectionRef {
	if db.FirestoreClient == nil {
		panic("Firestore client is not initialized")
	}
	return db.FirestoreClient.Collection("users")
}

// nextUserID returns the next numeric user ID by looking at the existing
// maximum id value in Firestore. If there are no users yet, it returns 1.
func nextUserID(ctx context.Context) (int64, error) {
	col := usersCollection()
	iter := col.OrderBy("id", firestore.Desc).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return 1, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get last user id: %w", err)
	}

	var data firestoreUserDoc
	if err := doc.DataTo(&data); err != nil {
		return 0, fmt.Errorf("failed to decode last user document: %w", err)
	}

	return data.ID + 1, nil
}

// Save creates a new user in Firestore. It preserves the original behavior
// where the very first user becomes an admin and subsequent users are
// regular users by default.
func (u *User) Save() error {
	ctx := context.Background()
	col := usersCollection()

	// Ensure the username is unique.
	dupIter := col.Where("username", "==", u.Username).Limit(1).Documents(ctx)
	defer dupIter.Stop()

	if _, err := dupIter.Next(); err != iterator.Done {
		if err == nil {
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("failed to check for existing user: %w", err)
	}

	// Determine role: first user ever becomes admin, others default to user.
	role := "user"
	adminIter := col.Where("role", "==", "admin").Limit(1).Documents(ctx)
	defer adminIter.Stop()

	if _, err := adminIter.Next(); err == iterator.Done {
		role = "admin"
	} else if err != nil {
		return fmt.Errorf("failed to check for existing admin: %w", err)
	}

	// Get the next numeric ID.
	nextID, err := nextUserID(ctx)
	if err != nil {
		return err
	}

	// Hash the password before storing.
	passwordHash, err := utils.HashPassword(u.Password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	doc := firestoreUserDoc{
		ID:           nextID,
		Username:     u.Username,
		PasswordHash: passwordHash,
		Role:         role,
	}

	// Use an auto-generated document ID; we rely on the stored numeric ID
	// field for relationships and JWTs.
	_, _, err = col.Add(ctx, doc)
	if err != nil {
		return fmt.Errorf("failed to create user in Firestore: %w", err)
	}

	u.ID = nextID
	u.Role = role
	return nil
}

// GetAllUsers returns all users without exposing password hashes.
func GetAllUsers() ([]User, error) {
	ctx := context.Background()
	col := usersCollection()
	iter := col.Documents(ctx)
	defer iter.Stop()

	var users []User
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate users: %w", err)
		}

		var data firestoreUserDoc
		if err := doc.DataTo(&data); err != nil {
			return nil, fmt.Errorf("failed to decode user document: %w", err)
		}

		users = append(users, User{
			ID:       data.ID,
			Username: data.Username,
			Role:     data.Role,
		})
	}

	return users, nil
}

// ValidateCredentials validates a username/password combination against
// Firestore and populates the User struct with ID and Role on success.
func (u *User) ValidateCredentials() error {
	ctx := context.Background()
	col := usersCollection()

	iter := col.Where("username", "==", u.Username).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to query user by username: %w", err)
	}

	var data firestoreUserDoc
	if err := doc.DataTo(&data); err != nil {
		return fmt.Errorf("failed to decode user document: %w", err)
	}

	if !utils.CheckPasswordHash(u.Password, data.PasswordHash) {
		return ErrInvalidCredentials
	}

	u.ID = data.ID
	u.Role = data.Role
	return nil
}

// UpdateUserRole updates a user's role while preserving the original
// semantics, including preventing demotion of the last admin.
func UpdateUserRole(userID int64, newRole string) error {
	if newRole != "admin" && newRole != "editor" && newRole != "user" {
		return ErrInvalidRole
	}

	ctx := context.Background()
	col := usersCollection()

	// Find the user document by id field.
	iter := col.Where("id", "==", userID).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to query user by id: %w", err)
	}

	var data firestoreUserDoc
	if err := doc.DataTo(&data); err != nil {
		return fmt.Errorf("failed to decode user document: %w", err)
	}

	// If this user is currently an admin and we're demoting them, ensure they
	// are not the last remaining admin.
	if data.Role == "admin" && newRole != "admin" {
		adminIter := col.Where("role", "==", "admin").Documents(ctx)
		defer adminIter.Stop()

		adminCount := 0
		for {
			_, err := adminIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return fmt.Errorf("failed to count admins: %w", err)
			}
			adminCount++
		}

		if adminCount <= 1 {
			return ErrCannotDemoteLastAdmin
		}
	}

	_, err = doc.Ref.Update(ctx, []firestore.Update{
		{Path: "role", Value: newRole},
	})
	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	return nil
}

// DeleteUser removes a user document from Firestore. If the user is an admin,
// this function ensures they are not the last remaining admin, reusing the
// same safety semantics as UpdateUserRole.
func DeleteUser(userID int64) error {
	ctx := context.Background()
	col := usersCollection()

	// Find the user document by id field.
	iter := col.Where("id", "==", userID).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to query user by id: %w", err)
	}

	var data firestoreUserDoc
	if err := doc.DataTo(&data); err != nil {
		return fmt.Errorf("failed to decode user document: %w", err)
	}

	// If this user is currently an admin, ensure they are not the last
	// remaining admin before deleting.
	if data.Role == "admin" {
		adminIter := col.Where("role", "==", "admin").Documents(ctx)
		defer adminIter.Stop()

		adminCount := 0
		for {
			_, err := adminIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return fmt.Errorf("failed to count admins: %w", err)
			}
			adminCount++
		}

		if adminCount <= 1 {
			return ErrCannotDemoteLastAdmin
		}
	}

	// Anonymize any comments authored by this user so their content remains
	// but no longer links back to their account.
	if err := AnonymizeCommentsForUser(userID); err != nil {
		return fmt.Errorf("failed to anonymize user comments: %w", err)
	}

	if _, err := doc.Ref.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

// FindOrCreateUserByEmail finds a user by email (used as username) or creates
// a new one if it does not exist. This is used for Google login.
func FindOrCreateUserByEmail(email, googleSub string) (*User, error) {
	ctx := context.Background()
	col := usersCollection()

	iter := col.Where("username", "==", email).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil && err != iterator.Done {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	if err == nil {
		// Existing user.
		var data firestoreUserDoc
		if err := doc.DataTo(&data); err != nil {
			return nil, fmt.Errorf("failed to decode user document: %w", err)
		}

		return &User{
			ID:       data.ID,
			Username: data.Username,
			Role:     data.Role,
		}, nil
	}

	// No existing user; create one. We still need a password for the hashing
// and storage pipeline, but it will not actually be used for authentication
// when logging in via Google.
	placeholderPassword := "google:placeholder"
	if googleSub != "" {
		placeholderPassword = "google:" + googleSub
	}

	newUser := &User{
		Username: email,
		Password: placeholderPassword,
	}

	if err := newUser.Save(); err != nil {
		// If another process created the user concurrently, fall back to
		// reading it.
		if errors.Is(err, ErrUserAlreadyExists) {
			return FindOrCreateUserByEmail(email, "")
		}
		return nil, err
	}

	return newUser, nil
}

	// GetUserByID looks up a user by their numeric ID.
	func GetUserByID(userID int64) (*User, error) {
		ctx := context.Background()
		col := usersCollection()

		iter := col.Where("id", "==", userID).Limit(1).Documents(ctx)
		defer iter.Stop()

		doc, err := iter.Next()
		if err == iterator.Done {
			return nil, ErrUserNotFound
		}
		if err != nil {
			return nil, fmt.Errorf("failed to query user by id: %w", err)
		}

		var data firestoreUserDoc
		if err := doc.DataTo(&data); err != nil {
			return nil, fmt.Errorf("failed to decode user document: %w", err)
		}

		return &User{
			ID:       data.ID,
			Username: data.Username,
			Role:     data.Role,
		}, nil
	}
