const { input, password } = require("@inquirer/prompts");
const fs = require("fs");

(async () => {
  if (!fs.existsSync(__dirname + "/.denv")) {
    console.info(
      "\x1b[31mPLEASE READ AND FOLLOW CAREFULLY TO RUN PROJECT SUCCESSFULLY\x1b[0m",
      "\n\nTo get the \x1b[1mGitHub AppID\x1b[0m, \x1b[1mClientID\x1b[0m, \x1b[1mClientSecret\x1b[0m, \x1b[1mWebhookSecret\x1b[0m and \x1b[1mPrivateKey\x1b[0m, create your personal GitHub App by following the instructions in this link: \x1b[34mhttps://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app\x1b[0m",
      "\n\n copy and paste the values in the prompts below\n\n"
    );
    const values = {
      // GitHub App configuration
      github_app_id: await input({
        message: "Your personal Github App ID: ",
      }),

      github_app_client_ID: await input({
        message: "Your personal Github App Client ID: ",
      }),

      github_app_client_secret: await input({
        message: "Your personal Github App Client Secret:",
      }),

      github_app_webhook_secret: await input({
        message: "Your personal Github App Webhook Secret:",
      }),

      github_app_private_key: await input({
        message:
          "Your personal Github App Private Key (starts with -----BEGIN PRIVATE... and ends with ...END PRIVATE-----):",
      }),

      // Github OAuth configuration
      github_auth_client_ID: await input({
        message: "Your personal Github OAuth App Client ID: ",
      }),
      github_auth_client_secret: await input({
        message: "Your personal Github OAuth App Client Secret:",
      }),

      // Gitlab OAuth configuration
      gitlab_client_ID: await input({
        message: "Your personal GitLab OAuth App Client ID: ",
      }),
      gitlab_client_secret: await input({
        message: "Your personal GitLab OAuth App Client Secret:",
      }),
      gitlab_redirect_uri: await input({
        message: "Your personal GitLab OAuth APP redirection URI:",
      }),

      // Augur configuration
      augur_app_client_secret: await input({
        message: "Your Augur App Client Secret: ",
      }),
      port: await input({
        message: "Port that you'd like server to run on: ",
        default: 4040,
      }),

      // email configuration
      email_host: await input({
        message: "Your email host:",
        default: "Gmail",
      }),

      email_address: await input({
        message: "Your email address:",
      }),

      email_password: await password({
        message: "Your email app password:",
        mask: true,
      }),
    };

    const envFile = `
        DB_NAME=badging
        DB_USER=badging
        DB_PASSWORD=badging
        DB_HOST=localhost
        DB_DIALECT=mysql

        GITHUB_AUTH_CLIENT_ID=${values.github_auth_client_ID}
        GITHUB_AUTH_CLIENT_SECRET=${values.github_auth_client_secret}

        GITHUB_APP_ID=${values.github_app_id}
        GITHUB_APP_CLIENT_ID=${values.github_app_client_ID}
        GITHUB_APP_CLIENT_SECRET=${values.github_app_client_secret}
        GITHUB_APP_WEBHOOK_SECRET=${values.github_app_webhook_secret}
        GITHUB_APP_PRIVATE_KEY="${values.github_app_private_key}"

        GITLAB_APP_CLIENT_ID=${values.gitlab_client_ID}
        GITLAB_APP_CLIENT_SECRET=${values.gitlab_client_secret}
        GITLAB_APP_REDIRECT_URI=${values.gitlab_redirect_uri}

        AUGUR_APP_CLIENT_SECRET=${values.augur_app_client_secret}
        PORT=${values.port}

        EMAIL_HOST=${values.email_host}
        EMAIL_ADDRESS=${values.email_address}
        EMAIL_PASSWORD=${values.email_password}
    `;

    fs.writeFileSync(".env", envFile);
    console.info("Configuration file (.env) created successfully.");
  }
})();
