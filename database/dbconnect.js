const mysql = require('mysql');
require('dotenv').config();

// Create a MySQL connection pool
const dbconnect = async () => {
    const db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    // Connect to MySQL server
    db.connect(async (err) => {
        if (err) throw err;
        console.log('Connected to MySQL server.');

        try {
            // Create the database if it doesn't exist
            await db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
            console.log('Database created or already exists.');

            // Use the newly created database
            db.changeUser({ database: process.env.DB_NAME }, (err) => {
                if (err) throw err;
                console.log('Using database:', process.env.DB_NAME);

                // Create tables if they don't exist
                createTables(db)
                    .then(() => {
                        console.log('Tables created or already exist.');
                    })
                    .finally(() => {
                        // Close the database connection when done
                        db.end((err) => {
                            if (err) throw err;
                            console.log('Database connection closed.');
                        });
                    });
            });
        } catch (error) {
            console.error('Error:', error.message);
            db.end();
        }
    });
};

// Function to create tables if they don't exist
const createTables = async (db) => {
    const usersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL
        );
    `;

    const reposTableQuery = `
        CREATE TABLE IF NOT EXISTS repos (
            uid VARCHAR(36) PRIMARY KEY,
            userId VARCHAR(36),
            githubRepoId INT NOT NULL,
            gitCommitSha VARCHAR(255) NOT NULL,
            repoLink VARCHAR(255) NOT NULL,
            badge VARCHAR(50) NOT NULL,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        );
    `;

    // Execute the table creation queries
    await db.query(usersTableQuery);
    await db.query(reposTableQuery);
};

module.exports = dbconnect;
