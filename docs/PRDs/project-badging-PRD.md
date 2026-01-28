# Product Requirements Document (PRD): Project Badging

## Overview

Project Badging is a process within the CHAOSS Badging Program that allows open source maintainers to earn a badge for their projects or communities by demonstrating the presence of DEI documentation in their repository.

Unlike Event Badging, Project Badging is an automated validation process with no peer review.

---

## Goals

- Enable open source maintainers to apply for a DEI badge for their project/community
- Automatically validate the presence of required `DEI.md` file.
- Award badge based on `DEI.md` contents
- Provide fast feedback to applicants

---

## Users

- **Applicant / Maintainer**: Applies for a project badge
- **Badging Bot**: Scans repositories and awards a badge

---

## Assumptions

- Users authenticate using GitHub or GitLab
- The badging bot is granted access to user repositories
- DEI documentation is stored in a `DEI.md` file
- Badge eligibility is determined solely by the `DEI.md` contents

---

## Functional Requirements

### 1. Application Initiation

- User clicks on “Apply for badge” on the Badging website
- User chooses to log in with GitHub or GitLab
- First-time users are asked to authorize access
- Returning users are authenticated automatically

---

### 2. Repository Selection

- After authentication:
  - The user is redirected back to the website
  - The system fetches all repositories accessible to the user
  - The repositories are presented for selection

---

### 3. Repository Scanning

- Once a repository is selected:
  - The badging bot scans the repository
  - The bot searches for a `DEI.md` file
  - The file is checked for required headings

---

### 4. Badge Awarding

- If `DEI.md` is found and meets requirements:
   - The badge is awarded
    - A success notification email containing the badge is sent to the user
- If not found or invalid:
  - No badge is awarded
  - An error or failure notification email is sent stating the reason
 

---

## Non-Functional Requirements

- Repository scanning must be deterministic
- Authentication tokens must be handled securely
- The system must respect API rate limits
- The process must complete within reasonable time

---

## Dependencies

- GitHub OAuth
- GitLab OAuth
- GitHub App
- GitLab API
- Repository content APIs

---

## Out of Scope

- Manual review
- Partial scoring
- Review checklists
- Issue-based workflows

---

## Success Metrics

- Successful badge issuance for eligible repositories
- Clear feedback on failure reasons
- Minimal false positives or negatives

## Future Version
- Awarding more than one level of badge (currently only one level, bronze, exists)

---

## Notes

Project Badging is intentionally automated and independent of Event Badging. While both processes share authentication and infrastructure, they must remain isolated at the business logic level to avoid unintended coupling.
