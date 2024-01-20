const { input, password } = require("@inquirer/prompts");
const fs = require("fs");

(async () => {
  if (!fs.existsSync(__dirname + "/.env")) {
    console.info(
      "Please input the fields below to configure your project locally"
    );
    const values = {
      db_name: await input({ message: "Your  database name:" }),
      db_user: await input({ message: "Your database user name:" }),
      db_password: await password({
        message: "Input your database password:",
        mask: true,
      }),
      db_host: await input({
        message: "MySQL database host address:",
        default: "localhost",
      }),
      db_dialect: await input({
        message: "Your database dialect:",
        default: "mysql",
      }),

      github_client_ID: await input({
        message: "Your personal Github OAuth App Client ID: ",
      }),
      github_client_secret: await input({
        message: "Your personal Github OAuth App Client Secret:",
      }),

      gitlab_client_ID: await input({
        message: "Your personal GitLab OAuth App Client ID: ",
      }),
      gitlab_client_secret: await input({
        message: "Your personal GitLab OAuth App Client Secret:",
      }),
      gitlab_redirect_uri: await input({
        message: "Your personal GitLab OAuth APP redirection URI:",
      }),

      augur_client_secret: await input({
        message: "Your Augur Client Secret: ",
      }),
      port: await input({
        message: "Port that you'd like server to run on: ",
        default: 4040,
      }),
    };

    const envFile = `
        DB_NAME=${values.db_name}
        DB_USER=${values.db_user}
        DB_PASSWORD=${values.db_password}
        DB_HOST=${values.db_host}
        DB_DIALECT=${values.db_dialect}

        GITHUB_APP_CLIENT_ID=${values.github_client_ID}
        GITHUB_APP_CLIENT_SECRET=${values.github_client_secret}

        GITLAB_APP_CLIENT_ID=${values.gitlab_client_ID}
        GITLAB_APP_CLIENT_SECRET=${values.gitlab_client_secret}
        GITLAB_APP_REDIRECT_URI=${values.gitlab_redirect_uri}

        AUGUR_CLIENT_SECRET=${values.augur_client_secret}
        PORT=${values.port}
    `;

    fs.writeFileSync(".env", envFile);
    console.info("Configuration file (.env) created successfully.");
  }
})();
