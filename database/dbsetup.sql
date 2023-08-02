CREATE DATABASE IF NOT EXISTS project_badging

-- USE project_badging

-- user table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- repo table
CREATE TABLE IF NOT EXISTS repos (
    uid VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36),
    githubRepoId INT NOT NULL,
    gitCommitSha VARCHAR(255) NOT NULL,
    repoLink VARCHAR(255) NOT NULL,
    badge VARCHAR(50) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
