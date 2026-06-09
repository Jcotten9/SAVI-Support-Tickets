/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ITIL 4 Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPPORT_AGENT_T1 = 'SUPPORT_AGENT_T1',
  SUPPORT_AGENT_T2 = 'SUPPORT_AGENT_T2',
  SUPPORT_AGENT_T3 = 'SUPPORT_AGENT_T3',
  CHANGE_MANAGER = 'CHANGE_MANAGER',
  PROBLEM_MANAGER = 'PROBLEM_MANAGER',
  REQUESTER = 'REQUESTER',
  AUDITOR = 'AUDITOR'
}

// Ticketing Categories
export enum TicketType {
  INCIDENT = 'INCIDENT',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  PROBLEM = 'PROBLEM',
  CHANGE = 'CHANGE',
  TASK = 'TASK'
}

// SLA State Clocks
export enum SLAStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  BREACHED = 'BREACHED',
  MET = 'MET'
}

// Incident Management Status States
export enum IncidentStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_ON_CUSTOMER = 'WAITING_ON_CUSTOMER',
  WAITING_ON_VENDOR = 'WAITING_ON_VENDOR',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED'
}

// Service Request Specific Status States
export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  IN_FULFILLMENT = 'IN_FULFILLMENT',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Problem Specific Status States
export enum ProblemStatus {
  NEW = 'NEW',
  INVESTIGATING = 'INVESTIGATING',
  ROOT_CAUSE_IDENTIFIED = 'ROOT_CAUSE_IDENTIFIED',
  KNOWN_ERROR = 'KNOWN_ERROR',
  FIX_IN_PROGRESS = 'FIX_IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// Change Enablement Specific Status States
export enum ChangeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

// Knowledge Lifecycle
export enum KBArticleStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

// Interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  teamId?: string;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  tier: number; // Business Criticality Level: 1 (High) to 3 (Low)
}

export interface Asset {
  id: string;
  name: string;
  type: string; // Server, Switch, Software License, Cloud Instance, etc.
  status: string; // Active, Retired, In Maintenance, Stock
  siteId: string;
  serialNumber?: string;
  ipAddress?: string;
  macAddress?: string;
  model: string;
  vendor: string;
  supportExpiration?: string;
  relatedServices: string[]; // Service IDs
  notes?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  impact: 'ENTERPRISE' | 'DEPARTMENT' | 'SINGLE_USER';
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string; // Dynamic based on type
  requesterId: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  
  // SLA metrics
  slaResponseTarget?: string; // ISO String
  slaResolutionTarget?: string; // ISO String
  slaResponseStatus: SLAStatus;
  slaResolutionStatus: SLAStatus;
  slaPaused: boolean;
  slaPausedTime?: string;
  lastSlaResumeTime?: string;
  responseBreached: boolean;
  resolutionBreached: boolean;

  // CMDB & Assets linkage
  relatedAssetId?: string;
  relatedServiceId?: string;
  relatedSiteId?: string;

  // Custom metadata fields
  internalNotes?: string;
  customerNotes?: string;
  tags: string[];
  watchers: string[]; // User IDs
  linkedTickets: string[]; // Ticket IDs with relation types
  
  // Custom type specific extensions
  majorIncident?: boolean;
  symptoms?: string;
  troubleshooting?: string;
  resolutionNotes?: string;
  rootCauseCandidate?: string;
  workaround?: string;

  // Service Request Forms
  catalogItemId?: string;
  requestFormData?: Record<string, any>;

  // Problem Analysis fields
  knownError?: boolean;
  rootCauseAnalysis?: string;
  permanentFix?: string;
  postIncidentReview?: string;

  // Change Management fields
  changeType?: 'STANDARD' | 'NORMAL' | 'EMERGENCY';
  reasonForChange?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  implementationPlan?: string;
  backoutPlan?: string;
  testPlan?: string;
  maintenanceWindowStart?: string;
  maintenanceWindowEnd?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface KBArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  environment?: string;
  symptoms?: string;
  cause?: string;
  resolution?: string;
  workaround?: string;
  relatedServices: string[]; // Service IDs
  relatedAssets: string[]; // Asset IDs
  tags: string[];
  authorId: string;
  reviewerId?: string;
  status: KBArticleStatus;
  isInternal: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  ticketId: string; // Reference to Change request ticket
  approverId: string;
  type: 'CAB' | 'MANAGER' | 'EMERGENCY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionDate?: string;
  comments?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  objectType: 'TICKET' | 'KNOWLEDGE' | 'ASSET' | 'APPROVAL' | 'USER';
  objectId: string;
  previousValue?: string;
  newValue?: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox';
    options?: string[];
    required: boolean;
  }[];
}
