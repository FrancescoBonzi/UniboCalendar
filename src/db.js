// src/db.js
// Centralized database connection management
import sqlite3 from "sqlite3";

const DB_FILE = "./logs/data.db";

// Create a single database instance
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Failed to connect to database:", err);
        process.exit(1);
    }
    console.log("Connected to SQLite database");
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Graceful shutdown
const closeDatabase = () => {
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err);
        } else {
            console.log("Database connection closed");
        }
    });
};

process.on("SIGINT", () => {
    closeDatabase();
    process.exit(0);
});

process.on("SIGTERM", () => {
    closeDatabase();
    process.exit(0);
});

process.on("exit", () => {
    db.close();
});

// Helper function to promisify database operations
export const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

export const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

export const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Initialize database tables and indexes
export const initDatabase = async () => {
    try {
        // Create tables
        await dbRun(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id TEXT PRIMARY KEY,
                date INTEGER NOT NULL,
                type TEXT NOT NULL,
                course TEXT NOT NULL,
                year INTEGER NOT NULL,
                curriculum TEXT
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS requested_lectures (
                enrollment_id TEXT NOT NULL,
                lecture_id TEXT NOT NULL,
                PRIMARY KEY (enrollment_id, lecture_id),
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS hits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date INTEGER NOT NULL,
                enrollment_id TEXT,
                user_agent TEXT,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS token (
                id TEXT PRIMARY KEY,
                description TEXT
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS cache (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expiration INTEGER NOT NULL
            )
        `);

        // Create indexes for better performance
        await dbRun("CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_enrollments_date ON enrollments(date)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_hits_enrollment ON hits(enrollment_id)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_hits_date ON hits(date)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_cache_expiration ON cache(expiration)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_requested_lectures_enrollment ON requested_lectures(enrollment_id)");

        console.log("Database tables and indexes initialized");
    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};

// Token validation for middleware (calls next() or sends error response)
export async function validateTokenMiddleware(req, res, next) {
    try {
        const providedToken = req.query.token;
        
        if (!providedToken) {
            return res.status(401).send('Token required');
        }
        
        // Basic input validation
        if (typeof providedToken !== 'string' || providedToken.length > 100) {
            return res.status(400).send('Invalid token format');
        }
        
        // Check token in database
        const row = await dbGet("SELECT id FROM token WHERE id = ?", [providedToken]);
        
        if (!row) {
            return res.status(403).send('Invalid token');
        }
        
        // Token is valid - proceed to next middleware
        next();
    } catch (err) {
        console.error("Database error in validateTokenMiddleware:", err);
        return res.status(500).send('Database error');
    }
}

// Token validation for API endpoints (returns JSON response)
export async function validateTokenEndpoint(req, res) {
    try {
        const providedToken = req.query.token;
        
        if (!providedToken) {
            return res.status(401).json({ error: "Token required" });
        }
        
        // Basic input validation
        if (typeof providedToken !== 'string' || providedToken.length > 100) {
            return res.status(400).json({ error: "Invalid token format" });
        }
        
        // Check token in database
        const row = await dbGet("SELECT id FROM token WHERE id = ?", [providedToken]);
        
        if (!row) {
            return res.status(403).json({ error: "Invalid token" });
        }
        
        // Token is valid
        res.json({ valid: true });
    } catch (err) {
        console.error("Database error in validateTokenEndpoint:", err);
        return res.status(500).json({ error: "Database error" });
    }
}

// Export the database instance for backward compatibility
export { db };
export default db;
