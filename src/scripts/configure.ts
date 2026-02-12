import { input, password } from '@inquirer/prompts';
import * as fs from 'fs';
import * as path from 'path';

interface ConfigValues {
  // Database configuration
  db_name: string;
  db_user: string;
  db_password?: string;
  db_host: string;
  db_port: string;

  // GitHub OAuth configuration
  github_auth_client_id: string;
  github_auth_client_secret: string;

  // GitHub App configuration
  github_app_id: string;
  github_app_client_id: string;
  github_app_client_secret: string;
  github_app_private_key: string;
  github_app_webhook_secret: string;

  // GitLab OAuth configuration
  gitlab_client_id: string;
  gitlab_client_secret: string;
  gitlab_redirect_uri: string;

  // Augur configuration
  augur_url: string;

  // Server configuration
  port: string;
  app_url: string;
  node_env: string;

  // Email configuration
  email_host: string;
  email_port: string;
  email_user: string;
  email_password: string;
  nodemailer_address: string;

  // Encryption
  encrypt_key: string;

  // Smee (development)
  smee_webhook_url: string;
}

async function configure(): Promise<void> {
  const envPath = path.resolve(__dirname, '../../.env');

  if (fs.existsSync(envPath)) {
    console.info('.env file already exists. Delete it first if you want to reconfigure.');
    return;
  }

  console.info('Please input the fields below to configure your project locally\n');

  const values: ConfigValues = {
    // Database configuration
    db_name: await input({ message: 'Database name:', default: 'badging' }),
    db_user: await input({ message: 'Database user name:', default: 'postgres' }),
    db_password: await password({ message: 'Database password (optional):', mask: true }) || undefined,
    db_host: await input({ message: 'Database host address:', default: 'localhost' }),
    db_port: await input({ message: 'Database port:', default: '5432' }),

    // GitHub OAuth configuration
    github_auth_client_id: await input({ message: 'GitHub OAuth App Client ID:' }),
    github_auth_client_secret: await input({ message: 'GitHub OAuth App Client Secret:' }),

    // GitHub App configuration
    github_app_id: await input({ message: 'GitHub App ID:' }),
    github_app_client_id: await input({ message: 'GitHub App Client ID:' }),
    github_app_client_secret: await input({ message: 'GitHub App Client Secret:' }),
    github_app_private_key: await input({ message: 'GitHub App Private Key (base64 encoded):' }),
    github_app_webhook_secret: await input({ message: 'GitHub App Webhook Secret:' }),

    // GitLab OAuth configuration
    gitlab_client_id: await input({ message: 'GitLab OAuth App Client ID:' }),
    gitlab_client_secret: await input({ message: 'GitLab OAuth App Client Secret:' }),
    gitlab_redirect_uri: await input({
      message: 'GitLab OAuth Redirect URI:',
      default: 'http://localhost:5000/api/callback/gitlab',
    }),

    // Augur configuration
    augur_url: await input({ message: 'Augur API URL:', default: 'https://ai.chaoss.io/api' }),

    // Server configuration
    port: await input({ message: 'Server port:', default: '5000' }),
    app_url: await input({ message: 'App URL:', default: 'http://localhost:5000' }),
    node_env: await input({ message: 'Node environment:', default: 'development' }),

    // Email configuration
    email_host: await input({ message: 'Email SMTP host:', default: 'smtp.gmail.com' }),
    email_port: await input({ message: 'Email SMTP port:', default: '587' }),
    email_user: await input({ message: 'Email username/address:' }),
    email_password: await password({ message: 'Email app password:', mask: true }),
    nodemailer_address: await input({ message: 'Nodemailer from address:' }),

    // Encryption
    encrypt_key: await input({
      message: 'Encryption key (32 characters for AES-256):',
      validate: (value) => value.length === 32 || 'Key must be exactly 32 characters',
    }),

    // Smee (development)
    smee_webhook_url: await input({
      message: 'Smee.io webhook URL (for development):',
      default: '',
    }),
  };

  const envFile = `# Server Configuration
NODE_ENV=${values.node_env}
PORT=${values.port}
APP_URL=${values.app_url}

# Database Configuration
DB_HOST=${values.db_host}
DB_PORT=${values.db_port}
DB_NAME=${values.db_name}
DB_USER=${values.db_user}
${values.db_password ? `DB_PASSWORD=${values.db_password}` : ''}
//DB_PASSWORD=${values.db_password}

# GitHub OAuth (for project badging)
GITHUB_CLIENT_ID=${values.github_auth_client_id}
GITHUB_CLIENT_SECRET=${values.github_auth_client_secret}

# GitHub App (for event badging webhooks)
GITHUB_APP_ID=${values.github_app_id}
GITHUB_APP_CLIENT_ID=${values.github_app_client_id}
GITHUB_APP_CLIENT_SECRET=${values.github_app_client_secret}
GITHUB_APP_PRIVATE_KEY=${values.github_app_private_key}
GITHUB_APP_WEBHOOK_SECRET=${values.github_app_webhook_secret}

# GitLab OAuth
GITLAB_CLIENT_ID=${values.gitlab_client_id}
GITLAB_CLIENT_SECRET=${values.gitlab_client_secret}
GITLAB_CALLBACK_URL=${values.gitlab_redirect_uri}

# Augur API
AUGUR_URL=${values.augur_url}

# Email (Nodemailer)
EMAIL_HOST=${values.email_host}
EMAIL_PORT=${values.email_port}
EMAIL_USER=${values.email_user}
EMAIL_PASSWORD=${values.email_password}
NODEMAILER_ADDRESS=${values.nodemailer_address}

# Encryption
ENCRYPT_KEY=${values.encrypt_key}

# Smee (development webhook forwarding)
SMEE_WEBHOOK_URL=${values.smee_webhook_url}
`;

  fs.writeFileSync(envPath, envFile);
  console.info('\n✅ Configuration file (.env) created successfully at project root.');
}

configure().catch((error) => {
  console.error('Configuration failed:', error);
  process.exit(1);
});
