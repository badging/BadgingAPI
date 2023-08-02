const mysql = require('mysql');
const fs = require('fs');
require('dotenv').config();
const path = require('path');

// Create a MySQL connection pool

const dbconnect = async () => {
    const db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    })

    await db.connect((err) => {
        if (err) throw err;
        console.log('Connected to MySQL server.');
    });
}

module.exports = dbconnect;