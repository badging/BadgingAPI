# Product Requirements Document (PRD): Event Badging

## Overview

Event Badging is a process within the CHAOSS Badging Program that allows event organizers to apply for a DEI-related badge. Applications are submitted via the Badging website and reviewed by assigned reviewers through a GitHub Issue–based workflow managed by a badging bot.

This process is reviewer-driven, asynchronous, and fully auditable via GitHub.

---

## Goals

- Enable event organizers to apply for CHAOSS Event Badging
- Facilitate structured peer review using checklists
- Ensure transparent scoring and badge assignment
- Automate issue creation, review tracking, and badge awarding

---

## Users

- **Applicant**: Submits an event for badging
- **Reviewer**: Reviews the event application
- **Badging Bot**: Automates workflow actions
- **Badging lead/maintainer**: Oversees the badging process

---

## Assumptions

- GitHub is the source of truth for review activity
- GitHub authentication is required to apply
- Reviews are conducted through GitHub Issues
- A minimum of two reviewers is required

---

## Functional Requirements

### 1. Application Submission

- User fills and submits the Event Badging form on the Badging website
- On submission, the user is redirected to GitHub for authentication
- GitHub requests authentication and authorization
- GitHub sends a temporary authorization code
- The server exchanges the code for an access token
- The system uses the access token to perform GitHub actions

---

### 2. Issue Creation

- The badging bot automatically creates a GitHub Issue in the `event-diversity-and-inclusion` repository
- The issue contains the submitted event application details
- The badging bot posts a thank-you comment acknowledging the application
- The bot begins listening for issue-related events

---

### 3. Reviewer Assignment & Checklist

- When a reviewer is assigned to the issue:
  - The badging bot posts a review checklist as a comment
  - Checklist headings are non-checkable
  - Review items are checkable
- When two reviewers are assigned:
  - The issue is automatically labeled `review-begin`

---

### 4. Scoring and Results

- When the badging lead comments `/result`:
  - The badging bot calculates the percentage score
  - Only checked boxes are counted
  - The bot posts:
    - Total percentage score
    - Number of reviewers assigned

---

### 5. Badge Assignment & Closure

- When a reviewer comments `/end`:
  - The badging bot:
    - Assigns the appropriate badge
    - Labels the issue `review-end`
    - Closes the issue

---

## Non-Functional Requirements

- Checklist parsing must be accurate and deterministic
- Review calculations must be reproducible
- Workflow must be resilient to partial failures
- Actions must be traceable via GitHub issue history

---

## Dependencies

- GitHub OAuth
- GitHub App
- GitHub Issues API

---

## Out of Scope

- Manual badge assignment
- Review outside GitHub
- Fewer than two reviewers

---

## Success Metrics

- Successful badge issuance after completed reviews
- Accurate checklist parsing and scoring
- Reduced reviewer confusion
- Clear audit trail per application

---

## Notes

Event Badging is a review-driven process and differs significantly from Project Badging in both workflow and automation requirements. The two processes share authentication and infrastructure but must remain logically independent.
