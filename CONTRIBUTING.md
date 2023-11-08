# Contributing to BadgingAPI!

👍🎉Thank you for your interest in contributing to BadgingAPI!  🎉👍

We are beyond excited to see that you want to contribute! 
Your contributions are a big help in improving this project. There are various ways to get involved with the BadgingAPI, and we value every single contribution.

Before you begin, please take a moment to go through these guidelines:
- [Code of Conduct](#code-of-conduct)
- [Who can contribute?](#who-can-contribute?)
- [How to Contribute](#how-to-contribute)
  - [Set up your Local Development Environment](#set-up-your-local-development-environment)
- [Code Style and Standards](#code-style-and-standards)

## Code of Conduct

Please note that this project has a [Code of Conduct](https://github.com/chaoss/.github/blob/main/CODE_OF_CONDUCT.md). We expect all contributors to adhere to it. Please take a moment to read through these guidelines to ensure a positive and inclusive contributor experience.

## Who can contribute?
The BadgingAPI is built by the community and warmly welcomes collaboration. So anyone can contribute to this project.

## How to Contribute

Here are the steps to follow to contribute to BadgingAPI:

1. **Fork the Repository**: Click the "Fork" button in the upper right-hand corner of the BadgingAPI repository on GitHub.

2. **Clone Your Fork**: Clone your fork of the repository to your local machine:
  
   *git clone https://github.com/your_username/BadgingAPI.git*

   replace `your_username` with your actual GitHub username

### Set up your Local Development Environment

#### Required dependencies

To Badging API requires NodeJS (18 or higher) and Docker installed locally.

N.B.: Docker Desktop isn't explicitly required, an alternative like Rancher Desktop works as well.

#### Running locally

Once the [required dependencies](#required-dependencies) are available in your system you can spin up the development environment.

1. Run `docker compose up -d` to start the database service
   - You can omit the `-d` to not start the container in the background
2. Run `npm install` to install the additional dependencies
3. Run `npm run dev`

This will start the Badging API service which will be available on port `8000`.

The port can be configured inside `.env.development`, as well as other configuration settings for the database.

#### Stopping the development environment

To stop the Badging API service issuing `Ctrl + C` on the terminal running it.

To stop the database container you can run `docker compose down`.

#### Troubleshooting

If the command `docker compose up -d` returns an error, make sure the `/tmp/mysql` folder exists. If it doesn't exist, create it.

### Contribution flow

1. **Create a Branch**: Create a new branch for your contribution:

   *git checkout -b your-branch-name*

2. **Make Changes**: Make your desired changes to the codebase. Ensure your code follows our coding standards and guidelines.

3. **Test**: Test your changes to ensure they work as expected.

4. **Commit Changes**: Commit your changes with a clear and descriptive message.

   *git add .
    git commit -S -m "<Brief description of your changes>"*

5. **Push Changes**: Push your changes to your fork on GitHub:

   *git push origin your-branch-name*

6. Create a Pull Request: Go to the BadgingAPI repository on GitHub and create a new pull request from your fork. Describe your changes and why they should be merged.

7. **Review and Discussion**: Your pull request will be reviewed by the maintainers and the community. Be prepared for feedback and be responsive to any suggested changes.

8. **Merge**: Once your pull request is approved, it will be merged into the main project.

## Code Style and Standards
BadgingAPI follows a specific code style and coding standards. Please make sure to adhere to these standards when contributing.

### Issue Tracking
If you're looking for ways to contribute but don't have specific code changes in mind, you can check the [issue tracker](https://github.com/AllInOpenSource/BadgingAPI/issues) for BadgingAPI on GitHub. You might find issues marked as "help wanted" or "good first issue."

Ask for help
If you have any questions or need assistance with your contribution, please contact get in touch with the project maintainers.

We appreciate your contributions and look forward to working with you to make BadgingAPI even better!