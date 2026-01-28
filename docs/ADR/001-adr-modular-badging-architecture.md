# ADR-001: Modularizing the Badging API Architecture

## Status
Accepted

## Date
2026-01-16

## Context

The CHAOSS Badging API currently supports two distinct badging processes under the same badging program:

- Event Badging
- Project Badging

While both processes share a common website and some infrastructure (authentication, GitHub/GitLab integrations), they represent different workflows, data flows, and responsibilities.

The current API codebase has several issues that affect that affect maintainability and clarity of process flow:

- Event Badging and Project Badging logic are tightly coupled and co-located.
- There is no clear separation of concerns between HTTP handling, business logic, and data access.
- Contributors cannot easily determine which part of the system they are modifying.
- Code is duplicated.
- Names of files and modules are ambiguous.
- Files and functions are not clearly attributable to a specific process.
- Database operations, business logic, and HTTP handling are intermixed.
- Checklist generation and parsing logic is fragile and difficult to trace.
- Refactoring or adding features risks unintended side effects across processes.
Logic flow is hard to trace, making debugging and feature addition difficult.


These issues increase cognitive load, slow onboarding, slow and ineffective contributions, and make safe parallel development difficult.

---

## Decision

We will refactor the Badging API to adopt a modular, layered architecture with explicit separation of concerns. This is necessary to improve the stability, clarity, and maintainability of the Badging System

### 1. Modular Separation by Process

The API will be structured around two top-level domains:

- `event-badging`
- `project-badging`

Each domain will encapsulate its own:
- Routes
- Controllers
- Services
- Data access logic
- Domain-specific models (where applicable)

Shared infrastructure and cross-cutting concerns will live in a `shared` directory.

---

### 2. Layered Architecture Within Each Module

Each module will follow a consistent internal structure:

```

/<domain>
/routes        → HTTP route definitions
/controllers   → Request/response orchestration
/services      → Business logic and workflows
/data-access   → Database read/write operations
/models        → ORM models and associations

```

---

### 3. Introduction of a Dedicated Data Access Layer

A dedicated Data Access Layer (DAL) will be introduced and named:

```

data-access

```

#### Rationale for Naming

- Avoids confusion with GitHub/GitLab “repositories”
- Clearly communicates responsibility
- Aligns with standard backend architecture terminology
- Improves contributor understanding and onboarding

#### Responsibilities of `data-access`

- Perform database reads and writes
- Interact directly with ORM models
- Contain no business logic
- Contain no HTTP or framework-specific code

Services must not interact with ORM models directly.

---

### 4. Strict Responsibility Boundaries

| Layer        | Responsibility |
|-------------|----------------|
| Routes       | Map URLs to controllers |
| Controllers  | Handle HTTP concerns (req/res, status codes) |
| Services     | Business rules, workflows, decisions |
| Data Access  | Database persistence and queries |
| Models       | Schema definitions and associations |

Business logic resides only in services.

Models remain declarative and must not contain:
- Workflow logic
- Formatting logic
- External API calls

---

### 5. Shared Infrastructure

Common components used by both domains will live under:

```

/shared

```

Including:
- Authentication providers
- External API clients (GitHub/GitLab)
- Shared models
- Shared data-access modules
- Common utilities

Any change to shared code requires explicit review due to its cross-domain impact.

---

## Consequences

### Positive Outcomes

- Clear ownership of Event Badging vs Project Badging code
- Safer parallel development by multiple contributors
- Improved testability through isolation of business logic
- Easier onboarding for new contributors
- Reduced risk of regressions during refactors
- Architecture that scales with new badging processes

### Trade-offs

- Initial refactor requires significant upfront time investment
- Requires contributors to follow stricter conventions
- Some boilerplate increases due to additional layers

These trade-offs are accepted in favor of long-term maintainability and contributor clarity.

---

## Implementation Plan

1.	Modularise the project to improve maintainability
2.	Separate concerns between project badging and event badging by determining which scopes to have.
3. Write proper tests for the api
4.	Improve security of the api and badging app by attending to the vulnerabilities of the packages
5.	Resolve the issue of checkbox on ticking on event-diversity-and-inclusion repo
6.	Deploy version 2.0
---


## Notes 

- Refactoring will be done incrementally to avoid breaking behavior.
- Files will be moved in small, verifiable steps with frequent commits.
- External integrations (GitHub/GitLab) will be mocked where possible during refactor.
- End-to-end integration testing will be performed after modularization.

---

## Related Documents

- Badging Data Flow Documentation
- Contributor Architecture Guide (planned)
- Refactoring Checklist (planned)

---

## Decision Drivers

- Maintainability
- Contributor clarity
- Safe parallel development
- Separation of concerns
- Long-term scalability of the badging program

