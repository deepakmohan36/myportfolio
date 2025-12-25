package db

import (
	"database/sql"
	"log"
	"os"
	"strings"
	_ "github.com/mattn/go-sqlite3" 			// adding a underscore to import the package solely for its side-effects
)

var DB *sql.DB 									// global variable to hold the database connection

func InitDB() {

		// Allow overriding the SQLite database path via an environment variable so
		// we can point it at /tmp/api.db when running in containers / Cloud Run,
		// where the root filesystem may be read-only and /tmp is the writable
		// location. For local development we keep the previous default of
		// "api.db" in the current working directory.
		dbPath := os.Getenv("SQLITE_DB_PATH")
		if dbPath == "" {
			dbPath = "api.db"
		}

		var err error
		DB, err = sql.Open("sqlite3", dbPath) 		// open a database connection with SQLite3 driver and api.db file. api.db is where the database will be stored
	if err != nil {
		panic("Failed to connect to database")	
	} 

	DB.SetMaxOpenConns(10)						// set maximum open connections to 10 for SQLite	
	DB.SetMaxIdleConns(5)						// set maximum idle connections to 5 for SQLite

	createTables()								// call createTables function to create necessary tables
}

func createTables() {

		createUsersTable := `CREATE TABLE IF NOT EXISTS users (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"username" TEXT NOT NULL UNIQUE,
		"password" TEXT NOT NULL,
		"role" TEXT NOT NULL DEFAULT 'user'
	  );`

			_, err := DB.Exec(createUsersTable)
			if err != nil {
				log.Printf("createUsersTable failed: %v", err)
				panic("Failed to create users table (see log for details)")
			}

				// For existing databases created before the "role" column existed, try to
				// add it. On a brand new database this will fail with
				// "duplicate column name: role", which we can safely ignore.
				if _, err = DB.Exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`); err != nil {
					if !strings.Contains(err.Error(), "duplicate column name") {
						panic("Failed to add role column to users table: " + err.Error())
					}
				}

			// Blog posts table for the portfolio/blog backend. The body content is
			// stored in the post_contents table, so this table only keeps metadata
			// about each post.
			createPostsTable := `CREATE TABLE IF NOT EXISTS posts (
				"id" INTEGER PRIMARY KEY AUTOINCREMENT,
				"title" TEXT NOT NULL,
				"description" TEXT,
				"category" TEXT,
				"status" TEXT NOT NULL DEFAULT 'published',
				"created_at" DATETIME NOT NULL,
				"updated_at" DATETIME NOT NULL,
				"author_id" INTEGER,
				"likes_count" INTEGER NOT NULL DEFAULT 0,
				"dislikes_count" INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY(author_id) REFERENCES users(id)
			  );`

					_, err = DB.Exec(createPostsTable)
					if err != nil {
						panic("Failed to create posts table")
					}

					// For existing databases created before the description/category/like/dislike/status
					// columns existed, try to add them. On a brand new database this will fail with
					// "duplicate column name", which we can safely ignore.
					if _, err = DB.Exec(`ALTER TABLE posts ADD COLUMN description TEXT`); err != nil {
						if !strings.Contains(err.Error(), "duplicate column name") {
							panic("Failed to add description column to posts table: " + err.Error())
						}
					}
					if _, err = DB.Exec(`ALTER TABLE posts ADD COLUMN category TEXT`); err != nil {
						if !strings.Contains(err.Error(), "duplicate column name") {
							panic("Failed to add category column to posts table: " + err.Error())
						}
					}
					if _, err = DB.Exec(`ALTER TABLE posts ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0`); err != nil {
						if !strings.Contains(err.Error(), "duplicate column name") {
							panic("Failed to add likes_count column to posts table: " + err.Error())
						}
					}
					if _, err = DB.Exec(`ALTER TABLE posts ADD COLUMN dislikes_count INTEGER NOT NULL DEFAULT 0`); err != nil {
						if !strings.Contains(err.Error(), "duplicate column name") {
							panic("Failed to add dislikes_count column to posts table: " + err.Error())
						}
					}
					if _, err = DB.Exec(`ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`); err != nil {
						if !strings.Contains(err.Error(), "duplicate column name") {
							panic("Failed to add status column to posts table: " + err.Error())
						}
					}

			// Table to store Markdown content and versions for posts. Each row is a
			// specific version of a post's body, so we can support history and drafts
			// later without bloating the main posts table.
			createPostContentsTable := `CREATE TABLE IF NOT EXISTS post_contents (
				"id" INTEGER PRIMARY KEY AUTOINCREMENT,
				"post_id" INTEGER NOT NULL,
				"version" INTEGER NOT NULL,
				"body_markdown" TEXT NOT NULL,
				"created_at" DATETIME NOT NULL,
				FOREIGN KEY(post_id) REFERENCES posts(id)
			);`

			_, err = DB.Exec(createPostContentsTable)
			if err != nil {
				panic("Failed to create post_contents table")
			}

			// Ensure we can uniquely identify each version for a post.
			if _, err = DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_post_contents_post_version ON post_contents(post_id, version)`); err != nil {
				panic("Failed to create idx_post_contents_post_version index: " + err.Error())
			}

			// If this database was created before we moved content into the
			// post_contents table, backfill from the legacy posts.content column
			// (if it still exists) and then drop that column.
			backfillAndDropLegacyContentColumn()

				// Per-user reactions for posts, enforcing that a user can only have
				// one reaction (like or dislike) per post.
				createReactionsTable := `CREATE TABLE IF NOT EXISTS post_reactions (
					"id" INTEGER PRIMARY KEY AUTOINCREMENT,
					"user_id" INTEGER NOT NULL,
					"post_id" INTEGER NOT NULL,
					"reaction" TEXT NOT NULL CHECK (reaction IN ('like','dislike')),
					UNIQUE(user_id, post_id),
					FOREIGN KEY(user_id) REFERENCES users(id),
					FOREIGN KEY(post_id) REFERENCES posts(id)
				);`

				_, err = DB.Exec(createReactionsTable)
				if err != nil {
					panic("Failed to create post_reactions table")
				}
		
}

// backfillAndDropLegacyContentColumn migrates any existing data from the
// legacy posts.content column into post_contents (as version 1) and then
// removes the content column from the posts table. On a brand new database
// where the content column never existed, this function is a no-op.
func backfillAndDropLegacyContentColumn() {
	// Only proceed if the legacy content column still exists.
	if !columnExists("posts", "content") {
		return
	}

	// Backfill existing posts into post_contents. For any post that does not yet
	// have a content row, create version 1 using the current content.
	if _, err := DB.Exec(`
		INSERT INTO post_contents (post_id, version, body_markdown, created_at)
		SELECT p.id, 1, p.content, COALESCE(p.updated_at, p.created_at)
		FROM posts p
		WHERE NOT EXISTS (
			SELECT 1 FROM post_contents pc WHERE pc.post_id = p.id
		)
	`); err != nil {
		panic("Failed to backfill post_contents table: " + err.Error())
	}

	// Rebuild the posts table without the legacy content column. We perform
	// the usual SQLite pattern: create a new table, copy data, drop the old
	// table, then rename.
	if _, err := DB.Exec(`PRAGMA foreign_keys = OFF`); err != nil {
		panic("Failed to disable foreign keys: " + err.Error())
	}

	tx, err := DB.Begin()
	if err != nil {
		panic("Failed to begin transaction to drop content column: " + err.Error())
	}

	// New posts table definition without the content column.
	if _, err := tx.Exec(`
		CREATE TABLE posts_new (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"title" TEXT NOT NULL,
			"description" TEXT,
			"category" TEXT,
			"status" TEXT NOT NULL DEFAULT 'published',
			"created_at" DATETIME NOT NULL,
			"updated_at" DATETIME NOT NULL,
			"author_id" INTEGER,
			"likes_count" INTEGER NOT NULL DEFAULT 0,
			"dislikes_count" INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(author_id) REFERENCES users(id)
		);
	`); err != nil {
		tx.Rollback()
		panic("Failed to create posts_new table: " + err.Error())
	}

	// Copy data from the old posts table (including the content column, which we
	// now ignore) into the new schema.
	if _, err := tx.Exec(`
		INSERT INTO posts_new (
			id, title, description, category, status,
			created_at, updated_at, author_id, likes_count, dislikes_count
		)
		SELECT
			id, title, description, category, status,
			created_at, updated_at, author_id, likes_count, dislikes_count
		FROM posts;
	`); err != nil {
		tx.Rollback()
		panic("Failed to copy data into posts_new: " + err.Error())
	}

	if _, err := tx.Exec(`DROP TABLE posts;`); err != nil {
		tx.Rollback()
		panic("Failed to drop old posts table: " + err.Error())
	}

	if _, err := tx.Exec(`ALTER TABLE posts_new RENAME TO posts;`); err != nil {
		tx.Rollback()
		panic("Failed to rename posts_new to posts: " + err.Error())
	}

	if err := tx.Commit(); err != nil {
		panic("Failed to commit posts table migration: " + err.Error())
	}

	if _, err := DB.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		panic("Failed to re-enable foreign keys: " + err.Error())
	}
}

// columnExists returns true if the given column exists on the specified
// table. It uses PRAGMA table_info, which is available in SQLite.
func columnExists(tableName, columnName string) bool {
	rows, err := DB.Query("PRAGMA table_info(" + tableName + ")")
	if err != nil {
		return false
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dfltValue sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil {
			return false
		}
		if name == columnName {
			return true
		}
	}

	return false
}



	
