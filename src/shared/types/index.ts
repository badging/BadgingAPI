/**
 * Shared Types and Interfaces for DEI Badging API
 */

// ============================================================================
// Provider Types
// ============================================================================

export type Provider = 'github' | 'gitlab';

// ============================================================================
// User Types
// ============================================================================

export interface IUserInfo {
  login: string;
  name: string;
  email: string;
  id: number;
}

export interface IUserAttributes {
  id?: number;
  login: string;
  name: string;
  email: string;
  githubId: number | null;
  gitlabId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserCreationAttributes {
  login: string;
  name: string;
  email: string;
  githubId?: number | null;
  gitlabId?: number | null;
}

// ============================================================================
// Repository Types
// ============================================================================

export interface IRepositoryInfo {
  id: number;
  fullName: string;
}

export interface IRepositoryDetails {
  id: number;
  url: string;
  fullName?: string;
  defaultBranch?: string;
}

export interface IFileContent {
  sha: string;
  content: string;
}

export interface IRepoAttributes {
  id?: number;
  githubRepoId: number | null;
  gitlabRepoId: number | null;
  DEICommitSHA: string;
  repoLink: string;
  badgeType: string;
  attachment: string;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRepoCreationAttributes {
  githubRepoId?: number | null;
  gitlabRepoId?: number | null;
  DEICommitSHA: string;
  repoLink: string;
  badgeType: string;
  attachment: string;
  userId: number;
}

// ============================================================================
// Event Badging Types
// ============================================================================

export type EventType = 'virtual' | 'in-person';

export type BadgeLevel = 'Pending' | 'Passing' | 'Silver' | 'Gold';

export interface IEventBadge {
  name: BadgeLevel;
  badgeURL: string;
}

export interface IEventReviewer {
  name: string;
  github_profile_link: string;
}

export interface IEventApplication {
  app_no: number;
  app_URL: string;
}

export interface IEventAttributes {
  id?: number;
  date?: Date;
  event_name: string;
  event_URL: string;
  badge: IEventBadge;
  reviewers: IEventReviewer[];
  application: IEventApplication;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEventCreationAttributes {
  event_name: string;
  event_URL: string;
  badge: IEventBadge;
  reviewers: IEventReviewer[];
  application: IEventApplication;
}

// ============================================================================
// Badge Calculation Types
// ============================================================================

export interface IBadgeCalculationResult {
  markdownBadgeImage: string;
  htmlBadgeImage: string;
  reviewResult: number;
  reviewerCount: number;
  assigned_badge: BadgeLevel;
  badge_URL: string;
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface IOAuthTokenResponse {
  access_token: string;
  errors: string[];
}

export interface IAuthCallbackResult {
  userId: number;
  name: string;
  username: string;
  email: string;
  repos: IRepositoryInfo[];
  provider: Provider;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IOperationResult<T = unknown> {
  data: T | null;
  errors: string[];
}

// ============================================================================
// GitHub Webhook Payload Types
// ============================================================================

export interface IGitHubUser {
  login: string;
  id: number;
  html_url: string;
  type: string;
}

export interface IGitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: IGitHubUser;
}

export interface IGitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  user: IGitHubUser;
  assignees: IGitHubUser[];
}

export interface IGitHubComment {
  id: number;
  body: string;
  user: IGitHubUser;
}

export interface IGitHubInstallation {
  id: number;
}

export interface IGitHubWebhookPayload {
  action: string;
  issue?: IGitHubIssue;
  comment?: IGitHubComment;
  repository: IGitHubRepository;
  sender: IGitHubUser;
  assignee?: IGitHubUser;
  installation: IGitHubInstallation;
}

// ============================================================================
// Email Types
// ============================================================================

export interface IEmailOptions {
  to: string;
  recipientName: string;
  badgeName: string;
  markdownLink?: string | null;
  htmlLink?: string | null;
  results?: string | null;
}

// ============================================================================
// DEI Scanning Types
// ============================================================================

export interface IDEIScanResult {
  repoUrl: string;
  success: boolean;
  message: string;
  badgeAwarded?: boolean;
}

export const DEI_REQUIRED_SECTIONS = [
  'Project Access',
  'Communication Transparency',
  'Newcomer Experiences',
  'Inclusive Leadership',
] as const;

export type DEISection = (typeof DEI_REQUIRED_SECTIONS)[number];
