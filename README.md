# DEI Badging API

Server-side application for the CHAOSS DEI Badging program, supporting both **Project Badging** (automated DEI.md scanning) and **Event Badging** (review-driven process via GitHub webhooks).

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **TypeDI** - Dependency injection
- **routing-controllers** - Decorator-based HTTP routing
- **sequelize-typescript** - TypeScript ORM
- **Express** - HTTP server

## Quick Start

```bash
cd src
npm install
npm run configure  # Interactive setup for .env
npm run dev        # Development server with hot reload
```

## Project Structure

```
src/
├── shared/           # Shared code (types, services, providers, data-access)
├── auth/             # Authentication module (GitHub/GitLab OAuth)
├── project-badging/  # Automated DEI badge scanning
├── event-badging/    # Review-driven event badging via webhooks
├── scripts/          # CLI tools (configure.ts)
├── app.ts            # Express app configuration
└── index.ts          # Server entry point
```

## API Endpoints

| Endpoint               | Method | Description                 |
| ---------------------- | ------ | --------------------------- |
| `/api/callback/github` | GET    | GitHub OAuth callback       |
| `/api/callback/gitlab` | GET    | GitLab OAuth callback       |
| `/api/badgedRepos`     | GET    | Get all badged repositories |
| `/api/repos-to-badge`  | POST   | Scan repos for DEI.md       |
| `/api/event_badging`   | POST   | GitHub webhook for events   |
| `/api/badged_events`   | GET    | Get all badged events       |

## Documentation

- [Architecture Decision Record](docs/ADR/001-adr-modular-badging-architecture.md)
- [Event Badging PRD](docs/PRDs/event-badging-PRD.md)
- [Project Badging PRD](docs/PRDs/project-badging-PRD.md)

## License

See [LICENSE](LICENSE) file.
