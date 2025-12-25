package utils

import (
    "context"
    "encoding/json"
    "errors"
    "net/http"
    "net/url"
    "os"
)

	// googleTokenInfo represents the subset of fields we care about from Google's
	// tokeninfo endpoint when validating a Google ID token.
	type googleTokenInfo struct {
	    Iss     string `json:"iss"`
	    Aud     string `json:"aud"`
	    Email   string `json:"email"`
	    Sub     string `json:"sub"`
	    Name    string `json:"name"`
	    Picture string `json:"picture"`
	}

	// VerifyGoogleIDToken validates a Google ID token by calling Google's
	// https://oauth2.googleapis.com/tokeninfo endpoint. It ensures the token was
	// issued for our configured client ID and returns the associated email,
	// subject (Google user ID), display name, and profile picture URL (if
	// available).
	//
	// The GOOGLE_CLIENT_ID environment variable must be set to the OAuth 2.0
	// Client ID configured in your Google Cloud project.
	func VerifyGoogleIDToken(ctx context.Context, idToken string) (email, sub, name, picture string, err error) {
	    googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	    if googleClientID == "" {
	        return "", "", "", "", errors.New("GOOGLE_CLIENT_ID environment variable is not set")
	    }

	    if idToken == "" {
	        return "", "", "", "", errors.New("missing idToken")
	    }

    endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)

	    req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	    if err != nil {
	        return "", "", "", "", err
	    }

	    resp, err := http.DefaultClient.Do(req)
	    if err != nil {
	        return "", "", "", "", err
	    }
    defer resp.Body.Close()

	    if resp.StatusCode != http.StatusOK {
	        return "", "", "", "", errors.New("failed to verify Google ID token")
	    }

	    var info googleTokenInfo
	    if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
	        return "", "", "", "", err
	    }

    // Basic audience and issuer checks. Google may return either
    // "accounts.google.com" or "https://accounts.google.com" as the issuer.
	    if info.Aud != googleClientID {
	        return "", "", "", "", errors.New("Google ID token has invalid audience")
	    }
	    if info.Iss != "accounts.google.com" && info.Iss != "https://accounts.google.com" {
	        return "", "", "", "", errors.New("Google ID token has invalid issuer")
	    }
	    if info.Email == "" || info.Sub == "" {
	        return "", "", "", "", errors.New("Google ID token missing required claims")
	    }

	    return info.Email, info.Sub, info.Name, info.Picture, nil
}
