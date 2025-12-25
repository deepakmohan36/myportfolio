package db

import (
	"context"
	"fmt"
	"os"

	"cloud.google.com/go/firestore"
)

// FirestoreClient is a shared Firestore client used by parts of the
// application that have migrated from SQLite to Firestore (for now, the
// user model and authentication flow).
var FirestoreClient *firestore.Client

// InitFirestore initializes the global Firestore client using the
// GOOGLE_CLOUD_PROJECT environment variable for the project ID.
//
// It is safe to call this once at application startup. The returned client
// will be reused for the lifetime of the process.
func InitFirestore(ctx context.Context) error {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		return fmt.Errorf("GOOGLE_CLOUD_PROJECT environment variable is not set")
	}

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to create Firestore client: %w", err)
	}

	FirestoreClient = client
	return nil
}
