const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Repo = require('./models/Repo');

// Connect to MongoDB
const dbconnect = async () => {
    mongoose.connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
        .then(() => {
            console.log('Connected to MongoDB');
        })
        .catch((error) => {
            console.error('Error connecting to MongoDB:', error);
        });

}

// save user to database
const saveUser = async (login, name, email, githubId) => {
    const user = new User({
        login,
        name,
        email,
        githubId
    });
    await user.save()
        .then((user) => {
            return user._id;
            console.log(user._id)
            console.log('User created:', user);
        })
        .catch((error) => {
            console.error('Error creating user:', error);
        });
}

// save repo to database
const saveRepo = async (githubRepoId, DEICommitSHA, repoLink, badgeType, attachment, user) => {
    const repo = new Repo({
        githubRepoId,
        DEICommitSHA,
        repoLink,
        badgeType,
        attachment,
        user,
    });
    repo.save()
        .then((repo) => {
            console.log('Repo created:', repo);
        })
        .catch((error) => {
            console.error('Error creating repo:', error);
        });
}

module.exports = {dbconnect, saveUser, saveRepo}