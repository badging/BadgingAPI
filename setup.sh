#!/bin/bash

# Check if the user 'badging' exists
USER_EXISTS=$(mysql -sse "SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = 'badging')")
DB_EXISTS=$(mysql -sse "SELECT EXISTS(SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'badging')")

if [ "$USER_EXISTS" -eq 1 ]; then
  echo "User 'badging' already exists."
else
  mysql -e "CREATE USER 'badging'@'localhost' IDENTIFIED BY 'badging';"
fi

if [ "$DB_EXISTS" -eq 1 ]; then
  echo "Database 'badging' already exists."
else
  mysql -e "CREATE DATABASE badging;"
  mysql -e "GRANT ALL PRIVILEGES ON badging.* TO 'badging'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"
fi

# Generate a new Smee client URL
NEW_SMEE_URL=$(curl -s https://smee.io/new | grep -o 'https://smee.io/[a-zA-Z0-9]*')

# Check if the URL was generated successfully
if [ -z "$NEW_SMEE_URL" ]; then
  echo "Failed to generate a new Smee client URL."
  exit 1
fi

# Update the .env file with the new Smee client URL
if grep -q "^SMEE_CLIENT_URL=" .env; then
  sed -i '' "s|^SMEE_CLIENT_URL=.*|SMEE_CLIENT_URL=$NEW_SMEE_URL|" .env
else
  echo "SMEE_CLIENT_URL=$NEW_SMEE_URL" >> .env
fi

echo "Updated .env with new Smee client URL: $NEW_SMEE_URL"
