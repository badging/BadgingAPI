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
    try {
        // Find the user with the provided GitHub ID
        let user = await User.findOne({ githubId });

        if (!user) {
            // If user doesn't exist, create a new one
            user = new User({
                login,
                name,
                email,
                githubId,
            });
        } else {
            // Update name, email, and username (login) if they are different
            if (user.name !== name) user.name = name;
            if (user.email !== email) user.email = email;
            if (user.login !== login) user.login = login;
        }

        await user.save().then((user) => {
            console.log('User created:', user);
        });
    } catch (error) {
        console.error('Error saving user:', error);
    }
};


// save repo to database
const saveRepo = async (githubRepoId, DEICommitSHA, repoLink, badgeType, attachment, name) => {

    try {
        // find user  with the provided name
        let user = await User.findOne({ name });

        const repo = new Repo({
            githubRepoId,
            DEICommitSHA,
            repoLink,
            badgeType,
            attachment,
            user: user._id
        })

        const savedRepo = await repo.save();
        return savedRepo._id.valueOf();
    } catch (error) {
        console.error('Error saving repo:', error);

    }
}

module.exports = { dbconnect, saveUser, saveRepo }