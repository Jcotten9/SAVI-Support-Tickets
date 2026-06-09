/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  User, Team, Site, Service, Asset, Ticket, Comment, KBArticle,
  Approval, AuditLog, Notification, CatalogItem, UserRole,
  TicketType, SLAStatus, IncidentStatus, RequestStatus, ProblemStatus,
  ChangeStatus, KBArticleStatus
} from '../types/itsm';

// Ensure standard data directory
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'itsm_db.json');

// Interface representation for local file DB
export interface DBState {
  users: User[];
  teams: Team[];
  sites: Site[];
  services: Service[];
  assets: Asset[];
  tickets: Ticket[];
  comments: Comment[];
  kbArticles: KBArticle[];
  approvals: Approval[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  catalogItems: CatalogItem[];
}

// In-Memory state clone
let state: DBState = {
  users: [],
  teams: [],
  sites: [],
  services: [],
  assets: [],
  tickets: [],
  comments: [],
  kbArticles: [],
  approvals: [],
  auditLogs: [],
  notifications: [],
  catalogItems: []
};

// Generates persistent IDs
function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ITIL Priority Matrix
export function calculatePriority(impact: string, urgency: string): 'P1' | 'P2' | 'P3' | 'P4' {
  if (impact === 'COMPLETE_OUTAGE') {
    if (urgency === 'CRITICAL') return 'P1';
    if (urgency === 'HIGH') return 'P1';
    if (urgency === 'MEDIUM') return 'P2';
    return 'P3';
  } else if (impact === 'IMPACTING_REVENUE') {
    if (urgency === 'CRITICAL') return 'P1';
    if (urgency === 'HIGH') return 'P2';
    if (urgency === 'MEDIUM') return 'P3';
    return 'P3';
  } else { // SCHEDULED_UPGRADE
    if (urgency === 'CRITICAL') return 'P2';
    if (urgency === 'HIGH') return 'P3';
    if (urgency === 'MEDIUM') return 'P3';
    return 'P4';
  }
}

// Helper to add mock SLA targets based on Priority
export function computeSLATargets(priority: 'P1' | 'P2' | 'P3' | 'P4', now: Date = new Date()) {
  const responseMinutes = { P1: 15, P2: 60, P3: 240, P4: 480 };
  const resolutionMinutes = { P1: 240, P2: 480, P3: 1440, P4: 2880 }; // 4h, 8h, 24h (3 business days), 48h (5 business days)

  const respTarget = new Date(now.getTime() + responseMinutes[priority] * 60000);
  const resTarget = new Date(now.getTime() + resolutionMinutes[priority] * 60000);

  return {
    slaResponseTarget: respTarget.toISOString(),
    slaResolutionTarget: resTarget.toISOString()
  };
}

// Sync Cache state to disk
export function saveDBSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to sync ITSM DB to disk:', err);
  }
}

// Populate system seeds
function seedInitialData() {
  console.log('Seeding initial ITIL 4 enterprise data states...');

  // 1. Teams
  const teams: Team[] = [
    { id: 'team-t1-servicedesk', name: 'Service Desk Tier 1', description: 'Primary entry contact point, general workspace logins, and basic hardware troubleshooting.' },
    { id: 'team-t2-techops', name: 'Technical Operations Tier 2', description: 'Server clusters, core networks, databases, and platform integrations.' },
    { id: 'team-t3-devescalations', name: 'Development Escalation Tier 3', description: 'Core Application Bugfix specialists, product release and cloud service owners.' },
    { id: 'team-change-cab', name: 'Change Advisory Board (CAB)', description: 'Senior architectural stakeholders responsible for vetting, reviewing, scheduling risk changes.' },
    { id: 'team-problem-mgmt', name: 'Problem Management Squad', description: 'Investigate repetitive incident cycles, RCA documentations, and Known Error entries.' }
  ];

  // 2. Users
  const users: User[] = [
    { id: 'usr-admin-jack', username: 'jack.admin', email: 'jack@enterprise.io', role: UserRole.ADMIN, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-agent-t1-bob', username: 'bob.t1', email: 'bob@enterprise.io', role: UserRole.SUPPORT_AGENT_T1, teamId: 'team-t1-servicedesk', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-agent-t2-alice', username: 'alice.t2', email: 'alice@enterprise.io', role: UserRole.SUPPORT_AGENT_T2, teamId: 'team-t2-techops', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-agent-t3-dave', username: 'dave.t3', email: 'dave@enterprise.io', role: UserRole.SUPPORT_AGENT_T3, teamId: 'team-t3-devescalations', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-mgr-charlie', username: 'charlie.change', email: 'charlie@enterprise.io', role: UserRole.CHANGE_MANAGER, teamId: 'team-change-cab', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-mgr-pam', username: 'pam.problem', email: 'pam@enterprise.io', role: UserRole.PROBLEM_MANAGER, teamId: 'team-problem-mgmt', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-req-stewart', username: 'stewart.cust', email: 'COTT3N@gmail.com', role: UserRole.REQUESTER, avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr-auditor-eva', username: 'eva.audit', email: 'eva@enterprise.io', role: UserRole.AUDITOR, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' }
  ];

  // 3. Sites / Locations
  const sites: Site[] = [
    { id: 'site-chicago', name: 'Downtown Headquarters, Chicago IL', location: 'Floor 12-14, 200 W Jackson Blvd' },
    { id: 'site-london', name: 'London Regional Hub, UK', location: 'Office 4A, 30 Crown Place' },
    { id: 'site-tokyo', name: 'AWS Tokyo DC APAC', location: 'Region ap-northeast-1 Data Hub' }
  ];

  // 4. Services (The Core CMDB Dependency Services)
  const services: Service[] = [
    { id: 'svc-activedirectory', name: 'Active Directory Identity Core', description: 'Enterprise identity, Kerberos login domain control, and single-sign privileges.', tier: 1 },
    { id: 'svc-corporate-email', name: 'Corporate Email Exchange', description: 'Enterprise messaging boxes, server syncing, and SMTP mail gates.', tier: 2 },
    { id: 'svc-payment-gateway', name: 'Payment Gateway Broker', description: 'Production Stripe processing tunnel handling incoming business-to-business wire captures.', tier: 1 },
    { id: 'svc-global-vpn', name: 'Secured Global Corporate VPN', description: 'Encryption tunneling allowing remote laptops access into the sandbox data zones.', tier: 1 },
    { id: 'svc-erp-sap', name: 'SAP Finance ERP Suite', description: 'Accounting tables, general ledger systems, and invoice balance records.', tier: 2 }
  ];

  // 5. CMDB Configuration Items (Assets)
  const assets: Asset[] = [
    {
      id: 'ast-domain-controller',
      name: 'Windows Active Directory Server AD-SRV-01',
      type: 'Server (Virtual Virtual Machine)',
      status: 'Active',
      siteId: 'site-tokyo',
      serialNumber: 'SN-VM-98213-AD',
      ipAddress: '10.0.1.15',
      macAddress: '00:15:5D:01:DF:A2',
      model: 'Azure Standard_D4s_v5',
      vendor: 'Microsoft Azure Services',
      supportExpiration: '2028-12-31',
      relatedServices: ['svc-activedirectory'],
      notes: 'Contains primary AD DC controllers. Backups trigger snapshots daily at midnight UTC.'
    },
    {
      id: 'ast-cisco-switch',
      name: 'Core Cisco Backbone Router SW-CORE-A',
      type: 'Network Switch / Router',
      status: 'Active',
      siteId: 'site-chicago',
      serialNumber: 'SN-CSCO-00892',
      ipAddress: '192.168.1.1',
      macAddress: 'BC:16:65:21:A4:B0',
      model: 'Cisco Catalyst 9300-48UXM',
      vendor: 'Cisco Systems Inc',
      supportExpiration: '2026-10-15',
      relatedServices: ['svc-global-vpn'],
      notes: 'Main distribution rack 14, floor 12 server closet. Dual power supply configurations active.'
    },
    {
      id: 'ast-firewall',
      name: 'Palo Alto Edge Security Suite FW-CHICAGO-01',
      type: 'Network Firewall Infrastructure',
      status: 'Active',
      siteId: 'site-chicago',
      serialNumber: 'SN-PANW-8726-F',
      ipAddress: '192.168.1.254',
      macAddress: 'F4:0F:1B:32:C3:FF',
      model: 'Palo Alto PA-3220 NexGen',
      vendor: 'Palo Alto Networks',
      supportExpiration: '2027-01-20',
      relatedServices: ['svc-global-vpn'],
      notes: 'Manages office wide egress tunnels, traffic policing configurations, and remote VPN endpoint routing.'
    },
    {
      id: 'ast-zoom-box',
      name: 'Executive Boardroom Display Unit DSP-ZOOM-05',
      type: 'Display Node',
      status: 'Active',
      siteId: 'site-chicago',
      serialNumber: 'SN-LG-90184-OLED',
      model: 'LG OLED G3 Series 77 inch',
      vendor: 'LG Electronics Partner Corp',
      supportExpiration: '2026-08-11',
      relatedServices: [],
      notes: 'Mounted securely in Chicago HQ Room 12-A Corporate Boardroom. Connects to Zoom Rooms Mini-PC hub.'
    }
  ];

  // 6. Catalog Items (Service Catalog Products)
  const catalogItems: CatalogItem[] = [
    {
      id: 'cat-new-hire-access',
      name: 'New Hire Corporate Identity & Access Setup',
      description: 'Provision Active Directory accounts, email mailboxes, and standard enterprise permission trees for onboarding personnel.',
      icon: 'UserPlus',
      fields: [
        { name: 'fullName', label: 'Full Name of New Employee', type: 'text', required: true },
        { name: 'department', label: 'Assigned Business Department', type: 'select', options: ['Engineering', 'Marketing', 'Customer Success', 'Finance', 'Legal'], required: true },
        { name: 'startDate', label: 'Expected Employment Start Date (YYYY-MM-DD)', type: 'text', required: true },
        { name: 'hardwarePreference', label: 'Laptops Equipment Choice', type: 'select', options: ['MacBook Pro M3 Pro - 16"', 'Lenovo ThinkPad X1 Carbon - 14"'], required: true }
      ]
    },
    {
      id: 'cat-vpn-access',
      name: 'Secure Corporate Global VPN Certificate Request',
      description: 'Request Palo Alto GlobalProtect endpoint client access privileges to connect your laptop securely during remote workspace shifts.',
      icon: 'ShieldAlert',
      fields: [
        { name: 'businessJustification', label: 'Solid Business Case for Remote Sandbox Access', type: 'textarea', required: true },
        { name: 'ipLocation', label: 'Primary Remote Session IP / Country of Connection', type: 'text', required: true },
        { name: 'mfaConfirmed', label: 'I have configured Okta Google Auth on my phone', type: 'checkbox', required: true }
      ]
    },
    {
      id: 'cat-dev-license',
      name: 'Software License Request: JetBrains & GitHub Copilot Premium',
      description: 'Allocate single-user billing keys for essential developer runtime packages.',
      icon: 'Cpu',
      fields: [
        { name: 'softwareName', label: 'Requested Developer Package', type: 'select', options: ['JetBrains IntelliJ IDEA Ultimate', 'JetBrains WebStorm Pro License', 'GitHub Copilot Enterprise Seats'], required: true },
        { name: 'managerSignature', label: 'Approved Supervising Manager Name', type: 'text', required: true }
      ]
    }
  ];

  // 7. Base Tickets (Incidents, Requests, Problems, Changes)
  const now = new Date();
  const ticket1Created = new Date(now.getTime() - 2 * 3600000); // 2 hours ago
  const t1Targets = computeSLATargets('P1', ticket1Created);

  const ticket2Created = new Date(now.getTime() - 48 * 3600000); // 2 days ago
  const t2Targets = computeSLATargets('P2', ticket2Created);

  const ticket3Created = new Date(now.getTime() - 24 * 3600000); // 1 day ago
  const t3Targets = computeSLATargets('P3', ticket3Created);

  const tickets: Ticket[] = [
    {
      id: 'tkt-inc-001',
      title: 'Palo Alto Egress Firewall dropping corporate internal connections on VPN port 443',
      description: 'Active sessions for developers using the Chicago Edge Firewall are dropping randomly. Tracert results suggest routing loops forming because of Palo Alto security profile checks. Critically affecting remote developers on Tier 1 systems.',
      type: TicketType.INCIDENT,
      priority: 'P1',
      impact: 'COMPLETE_OUTAGE',
      urgency: 'CRITICAL',
      status: IncidentStatus.IN_PROGRESS,
      requesterId: 'usr-req-stewart',
      assignedAgentId: 'usr-agent-t2-alice',
      assignedTeamId: 'team-t2-techops',
      createdAt: ticket1Created.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: new Date(ticket1Created.getTime() + 4 * 3600000).toISOString(),
      
      slaResponseTarget: t1Targets.slaResponseTarget,
      slaResolutionTarget: t1Targets.slaResolutionTarget,
      slaResponseStatus: SLAStatus.MET, // Met
      slaResolutionStatus: SLAStatus.IN_PROGRESS,
      slaPaused: false,
      responseBreached: false,
      resolutionBreached: false,

      relatedAssetId: 'ast-firewall',
      relatedServiceId: 'svc-global-vpn',
      relatedSiteId: 'site-chicago',
      internalNotes: 'Alice (T2Ops): Core policy looks active. Checking Palo Alto traffic inspection policies. Security firmware auto-updated last night. Might need CAB Emergency rollback patch if firmware conflict persists.',
      customerNotes: 'We are actively analyzing the network routes for Palo Alto Edge gateway. Remote engineers might experience session toggling.',
      tags: ['Network', 'Firewall', 'Critical-Outage', 'PaloAlto'],
      watchers: ['usr-mgr-charlie', 'usr-agent-t3-dave'],
      linkedTickets: [],
      majorIncident: true,
      symptoms: 'Random drops on Port 443, ping delays on 192.168.1.254',
      troubleshooting: 'Cleared routing caches on core switch SW-CORE-A. VPN clients verified with local certificate auth checks.',
      rootCauseCandidate: 'Firmware PAN-OS 10.4 update auto applied last night conflict.'
    },
    {
      id: 'tkt-prob-001',
      title: 'Persistent Palo Alto WAN Traffic Drops on Downtown Chicago Switch Clusters',
      description: 'Review of network routing anomalies since the latest Palo Alto firmware update shows regular TCP reset frames injected at FW-CHICAGO-01. Affects the integrity of internal AD sync and VPN payloads.',
      type: TicketType.PROBLEM,
      priority: 'P2',
      impact: 'IMPACTING_REVENUE',
      urgency: 'HIGH',
      status: ProblemStatus.INVESTIGATING,
      requesterId: 'usr-mgr-pam',
      assignedAgentId: 'usr-mgr-pam',
      assignedTeamId: 'team-problem-mgmt',
      createdAt: ticket2Created.toISOString(),
      updatedAt: now.toISOString(),
      
      slaResponseTarget: t2Targets.slaResponseTarget,
      slaResolutionTarget: t2Targets.slaResolutionTarget,
      slaResponseStatus: SLAStatus.MET,
      slaResolutionStatus: SLAStatus.IN_PROGRESS,
      slaPaused: false,
      responseBreached: false,
      resolutionBreached: false,

      relatedAssetId: 'ast-firewall',
      relatedServiceId: 'svc-global-vpn',
      relatedSiteId: 'site-chicago',
      internalNotes: 'Reviewing incidents linked here. The symptoms exactly match ticket tkt-inc-001.',
      customerNotes: 'A Master Problem ticket has been opened to track persistent Palo Alto route drops.',
      tags: ['Network-Core', 'Problem-KEDB', 'PaloAlto'],
      watchers: ['usr-agent-t2-alice', 'usr-agent-t3-dave'],
      linkedTickets: ['tkt-inc-001'],
      knownError: true,
      rootCauseAnalysis: 'Unresolved route recursion loop in Palo Alto OS version 10.4 network optimization library.',
      workaround: 'Force Palo Alto interface traffic down to secondary trunk 100Mps fallback or toggle off advanced TLS decrypt profiling.'
    },
    {
      id: 'tkt-chg-101',
      title: 'Normal Change: Rollback Palo Alto Security Firmware configuration to Stable PAN-OS 10.2',
      description: 'Request permission to perform immediate rollback of Palo Alto Edge gateway fw-chicago-01 to firmware 10.2 to alleviate the critical routing issues causing active incident tkt-inc-001.',
      type: TicketType.CHANGE,
      priority: 'P1',
      impact: 'COMPLETE_OUTAGE',
      urgency: 'CRITICAL',
      status: ChangeStatus.AWAITING_APPROVAL,
      requesterId: 'usr-agent-t2-alice',
      assignedAgentId: 'usr-mgr-charlie',
      assignedTeamId: 'team-change-cab',
      createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      updatedAt: now.toISOString(),
      
      slaResponseStatus: SLAStatus.MET,
      slaResolutionStatus: SLAStatus.IN_PROGRESS,
      slaPaused: false,
      responseBreached: false,
      resolutionBreached: false,

      relatedAssetId: 'ast-firewall',
      relatedServiceId: 'svc-global-vpn',
      relatedSiteId: 'site-chicago',
      internalNotes: 'Must be routed directly to Change manager and approved by CAB members due to Enterprise high-risk rating.',
      customerNotes: 'A change ticket is scheduled to resolve network performance degradation.',
      tags: ['CAB-Enforced', 'Firewall-Upgrade', 'High-Risk'],
      watchers: ['usr-admin-jack', 'usr-agent-t3-dave'],
      linkedTickets: ['tkt-inc-001', 'tkt-prob-001'],
      changeType: 'NORMAL',
      reasonForChange: 'Resolve enterprise-wide remote developers connection drop cycles on VPN services.',
      riskLevel: 'HIGH',
      implementationPlan: '1. Log into core rack console Palo Alto FW-01.\n2. Export backup configs to safe cluster storage.\n3. Initiate downgrade payload firmware image-10.2.x.\n4. Re-sync configurations and verify routing protocols.',
      backoutPlan: 'Re-apply firmware 10.4 update cache and reload the backed-up environment configurations.',
      testPlan: 'Run remote VPN ping session loops on port 443 with automated packet verification scripts.',
      maintenanceWindowStart: new Date(now.getTime() + 10 * 60000).toISOString(), // Starts in 10 minutes
      maintenanceWindowEnd: new Date(now.getTime() + 2 * 3600000).toISOString() // 2 hours window
    },
    {
      id: 'tkt-req-002',
      title: 'Service Request: Allocating GitHub Copilot Enterprise license seats',
      description: 'Requesting access to copilot enterprise subscription for newly onboarded senior backend dev in support team.',
      type: TicketType.SERVICE_REQUEST,
      priority: 'P3',
      impact: 'SCHEDULED_UPGRADE',
      urgency: 'MEDIUM',
      status: RequestStatus.WAITING_FOR_APPROVAL,
      requesterId: 'usr-req-stewart',
      assignedAgentId: 'usr-agent-t1-bob',
      assignedTeamId: 'team-t1-servicedesk',
      createdAt: ticket3Created.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: new Date(ticket3Created.getTime() + 48 * 3600000).toISOString(),
      
      slaResponseTarget: t3Targets.slaResponseTarget,
      slaResolutionTarget: t3Targets.slaResolutionTarget,
      slaResponseStatus: SLAStatus.MET,
      slaResolutionStatus: SLAStatus.IN_PROGRESS,
      slaPaused: false,
      responseBreached: false,
      resolutionBreached: false,

      catalogItemId: 'cat-dev-license',
      requestFormData: {
        softwareName: 'GitHub Copilot Enterprise Seats',
        managerSignature: 'Sarah Lead Developer'
      },
      tags: ['Fulfillment', 'License', 'GitHub-Copilot'],
      watchers: [],
      linkedTickets: []
    }
  ];

  // 8. Ticket Comments (Internal vs Public)
  const comments: Comment[] = [
    {
      id: 'com-001',
      ticketId: 'tkt-inc-001',
      userId: 'usr-req-stewart',
      content: 'I have tried rebooting my corporate router twice, but session drops continue every 3-5 minutes on the spot. Please advise!',
      isInternal: false,
      createdAt: new Date(ticket1Created.getTime() + 30 * 60000).toISOString()
    },
    {
      id: 'com-002',
      ticketId: 'tkt-inc-001',
      userId: 'usr-agent-t1-bob',
      content: 'Escalated from Tier 1 Service Desk to TechOps NetOps team. Netflow analytics show router fw-chicago-01 terminating sessions. Alice, tagging you.',
      isInternal: true,
      createdAt: new Date(ticket1Created.getTime() + 45 * 60000).toISOString()
    }
  ];

  // 9. Knowledge Articles (KEDB and FAQs)
  const kbArticles: KBArticle[] = [
    {
      id: 'kb-001',
      title: 'Connecting cleanly to Enterprise Secure Global Protect VPN Router',
      summary: 'Clear instructional documentation of multi-factor login triggers, profile installations, and client connection setups.',
      content: '## Executive Summary\nAll corporate employees operating remotely MUST utilise the Secure Global Protect Palo Alto gateway connected through their laptops.\n\n### Connection Walkthrough\n1. Launch the Palo Alto GlobalProtect desktop widget.\n2. In portal entry input address `vpn.enterprise.io` and click **Connect**.\n3. A browser authentication popup will open. Authenticate utilizing active credentials.\n4. Approve the verification push notification sent straight to your registered mobile phone.\n\n### Connection Troubleshooting\n- If you receive **TLS Negotiation Errors**, verify that you can ping main DNS server `8.8.8.8` or that local ISP is not blocking port 443 TCP packets.',
      environment: 'Laptops running macOS Sonoma / Windows 11 Enterprise',
      symptoms: 'Global protect status stays "Connecting..." or raises socket error alerts.',
      cause: 'Local home firewall blocking essential TLS ports, or stale corporate credentials cached locally.',
      resolution: 'Clear Global protect local preferences caches or check with Security identity group for credentials verification.',
      relatedServices: ['svc-global-vpn'],
      relatedAssets: ['ast-firewall'],
      tags: ['VPN', 'Networking', 'Remote-Manual'],
      authorId: 'usr-agent-t2-alice',
      status: KBArticleStatus.PUBLISHED,
      isInternal: false,
      version: 1,
      createdAt: new Date(now.getTime() - 100 * 3600000).toISOString(),
      updatedAt: new Date(now.getTime() - 100 * 3600000).toISOString()
    }
  ];

  // 10. Approvals (CAB review requests)
  const approvals: Approval[] = [
    {
      id: 'app-001',
      ticketId: 'tkt-chg-101',
      approverId: 'usr-mgr-charlie',
      type: 'CAB',
      status: 'PENDING',
      createdAt: new Date(now.getTime() - 4 * 3600000).toISOString()
    }
  ];

  // 11. Notifications
  const notifications: Notification[] = [
    {
      id: 'not-001',
      userId: 'usr-mgr-charlie',
      title: 'New CAB Approval Required: normal Change Rollback Palo Alto firmware',
      message: 'Downgrade request tkt-chg-101 has been submitted by Alice. Your technical audit is required.',
      status: 'UNREAD',
      createdAt: new Date(now.getTime() - 4 * 3600000).toISOString()
    }
  ];

  state = {
    users,
    teams,
    sites,
    services,
    assets,
    tickets,
    comments,
    kbArticles,
    approvals,
    auditLogs: [],
    notifications,
    catalogItems
  };

  // Setup sample activity Audit Logs
  state.auditLogs = [
    {
      id: generateUUID(),
      timestamp: ticket1Created.toISOString(),
      userId: 'usr-req-stewart',
      action: 'TICKET_CREATE',
      objectType: 'TICKET',
      objectId: 'tkt-inc-001',
      details: 'Incident Ticket initiated with Enterprise impact by Stewart.'
    },
    {
      id: generateUUID(),
      timestamp: new Date(ticket1Created.getTime() + 45 * 60000).toISOString(),
      userId: 'usr-agent-t1-bob',
      action: 'TICKET_ASSIGNED',
      objectType: 'TICKET',
      objectId: 'tkt-inc-001',
      previousValue: 'Unassigned',
      newValue: 'Alice Tier 2 (usr-agent-t2-alice)',
      details: 'Ticket assigned and routed up to Tier 2 Support Team.'
    }
  ];

  saveDBSync();
  console.log('Seeding process complete. System states ready!');
}

// Load DB from file or seed if needed
export function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      state = JSON.parse(data);
      console.log('Loaded ITSM DB successfully containing', state.tickets.length, 'root tickets.');
    } else {
      seedInitialData();
    }
  } catch (err) {
    console.error('Failed to load ITSM DB file. Initializing in-memory seeds...', err);
    seedInitialData();
  }
}

// Global initialization
loadDB();

/**
 * DATABASE OPERATIONS API
 */
export const db = {
  // Queries
  getUsers: () => state.users,
  getUserById: (id: string) => state.users.find(u => u.id === id),
  getTeams: () => state.teams,
  getSites: () => state.sites,
  getServices: () => state.services,
  getAssets: () => state.assets,
  getCatalogItems: () => state.catalogItems,
  getCatalogItemById: (id: string) => state.catalogItems.find(i => i.id === id),

  getTickets: () => state.tickets,
  getTicketById: (id: string) => state.tickets.find(t => t.id === id),

  getComments: (ticketId: string) => state.comments.filter(c => c.ticketId === ticketId),
  getKBArticles: () => state.kbArticles,
  getKBArticleById: (id: string) => state.kbArticles.find(a => a.id === id),
  getApprovals: () => state.approvals,
  getApprovalsByTicket: (ticketId: string) => state.approvals.filter(a => a.ticketId === ticketId),
  getNotifications: (userId: string) => state.notifications.filter(n => n.userId === userId),
  getAuditLogs: (objectId?: string) => objectId ? state.auditLogs.filter(l => l.objectId === objectId).sort((a,b) => b.timestamp.localeCompare(a.timestamp)) : state.auditLogs,

  // MUTATIONS (Saves to disk immediately)

  createTicket: (ticketPayload: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaResponseStatus' | 'slaResolutionStatus' | 'slaPaused' | 'responseBreached' | 'resolutionBreached'> & { id?: string }) => {
    const tId = ticketPayload.id || `tkt-${ticketPayload.type.substring(0,3).toLowerCase()}-${generateUUID().substring(0, 4)}`;
    const nowStr = new Date().toISOString();
    
    // Auto calculate priority if Incident
    let finalPriority = ticketPayload.priority;
    if (ticketPayload.type === TicketType.INCIDENT) {
      finalPriority = calculatePriority(ticketPayload.impact, ticketPayload.urgency);
    }

    const slaTargets = computeSLATargets(finalPriority);

    const newTicket: Ticket = {
      ...ticketPayload,
      id: tId,
      priority: finalPriority,
      slaResponseTarget: ticketPayload.slaResponseTarget || slaTargets.slaResponseTarget,
      slaResolutionTarget: ticketPayload.slaResolutionTarget || slaTargets.slaResolutionTarget,
      slaResponseStatus: SLAStatus.IN_PROGRESS,
      slaResolutionStatus: SLAStatus.IN_PROGRESS,
      slaPaused: false,
      responseBreached: false,
      resolutionBreached: false,
      createdAt: nowStr,
      updatedAt: nowStr,
      tags: ticketPayload.tags || [],
      watchers: ticketPayload.watchers || [],
      linkedTickets: ticketPayload.linkedTickets || []
    };

    state.tickets.push(newTicket);
    
    // Log in Audit Trail
    db.createAuditLog({
      userId: ticketPayload.requesterId,
      action: 'TICKET_CREATE',
      objectType: 'TICKET',
      objectId: tId,
      details: `Ticket type ${ticketPayload.type} created. Status set to ${ticketPayload.status}. Priority computed: ${finalPriority}.`
    });

    // Auto trigger manager notification if high risk change
    if (newTicket.type === TicketType.CHANGE && newTicket.riskLevel === 'HIGH') {
      const changeMgr = state.users.find(u => u.role === UserRole.CHANGE_MANAGER);
      if (changeMgr) {
        db.createNotification({
          userId: changeMgr.id,
          title: `Risk Review Required for ${newTicket.id}`,
          message: `Change request "${newTicket.title}" possesses HIGH risk rating. CAB vetting advised.`
        });
        // Create matching Change approval record
        db.createApproval({
          ticketId: newTicket.id,
          approverId: changeMgr.id,
          type: 'CAB',
          status: 'PENDING'
        });
      }
    }

    saveDBSync();
    return newTicket;
  },

  updateTicket: (id: string, updates: Partial<Ticket>, triggerUserId: string) => {
    const tIndex = state.tickets.findIndex(t => t.id === id);
    if (tIndex === -1) throw new Error('Ticket not identified');

    const original = state.tickets[tIndex];
    
    // Calculate new priority if impact or urgency shift
    let finalUpdates = { ...updates };
    if (original.type === TicketType.INCIDENT && (updates.impact || updates.urgency)) {
      const imp = updates.impact || original.impact;
      const urg = updates.urgency || original.urgency;
      const computedP = calculatePriority(imp, urg);
      if (computedP !== original.priority) {
        finalUpdates.priority = computedP;
        const targets = computeSLATargets(computedP);
        finalUpdates.slaResponseTarget = targets.slaResponseTarget;
        finalUpdates.slaResolutionTarget = targets.slaResolutionTarget;
      }
    }

    const updatedTicket: Ticket = {
      ...original,
      ...finalUpdates,
      updatedAt: new Date().toISOString()
    };

    state.tickets[tIndex] = updatedTicket;

    // Track audits for significant shifts
    const keysToCheck: (keyof Ticket)[] = ['status', 'priority', 'assignedAgentId', 'assignedTeamId', 'slaPaused'];
    keysToCheck.forEach(key => {
      if (finalUpdates[key] !== undefined && finalUpdates[key] !== original[key]) {
        let det = `Attribute '${key}' changed from '${original[key]}' to '${finalUpdates[key]}'.`;
        if (key === 'slaPaused') {
          det = finalUpdates.slaPaused ? 'SLA clock PAUSED (Awaiting feedback).' : 'SLA clock RESUMED.';
        }
        db.createAuditLog({
          userId: triggerUserId,
          action: 'TICKET_UPDATE',
          objectType: 'TICKET',
          objectId: id,
          previousValue: String(original[key]),
          newValue: String(finalUpdates[key]),
          details: det
        });
      }
    });

    saveDBSync();
    return updatedTicket;
  },

  transitionTicket: (id: string, newStatus: string, triggerUserId: string, optionalNote?: string) => {
    const ticket = db.getTicketById(id);
    if (!ticket) throw new Error('Ticket not identified');

    const previousStatus = ticket.status;

    // ITIL STATE TRANSITIONS SANITY RULES
    if (ticket.type === TicketType.INCIDENT) {
      if (newStatus === IncidentStatus.CLOSED && previousStatus !== IncidentStatus.RESOLVED) {
        throw new Error('ITIL Incident Policy Violation: Tickets must reside in RESOLVED state before being officially CLOSED.');
      }
      if (newStatus === IncidentStatus.RESOLVED && !ticket.resolutionNotes && !optionalNote) {
        throw new Error('ITIL Incident Rule: Official incident resolutions require explicit descriptive Troubleshooting/Close Notes.');
      }
    }

    if (ticket.type === TicketType.CHANGE) {
      if (newStatus === ChangeStatus.SCHEDULED) {
        // Look for approval statuses
        const apprs = db.getApprovalsByTicket(id);
        const cabApproval = apprs.find(a => a.type === 'CAB');
        if (cabApproval && cabApproval.status !== 'APPROVED') {
          throw new Error('ITIL Change Release Gate: Changes require approved CAB reviews before scheduling maintenance slots.');
        }
      }
    }

    if (ticket.type === TicketType.PROBLEM) {
      if (newStatus === ProblemStatus.KNOWN_ERROR && !ticket.rootCauseAnalysis && !ticket.workaround) {
        throw new Error('ITIL Problem Practice: Known Errors must list a documented root cause scenario or temporary workaround in base KEDB.');
      }
    }

    // Toggle SLA clock pauses
    let slaPaused = ticket.slaPaused;
    let slaPausedTime = ticket.slaPausedTime;
    let lastSlaResumeTime = ticket.lastSlaResumeTime;
    
    // Incidents pause when waiting on customer
    if (ticket.type === TicketType.INCIDENT) {
      if (newStatus === IncidentStatus.WAITING_ON_CUSTOMER) {
        slaPaused = true;
        slaPausedTime = new Date().toISOString();
      } else if (previousStatus === IncidentStatus.WAITING_ON_CUSTOMER) {
        slaPaused = false;
        lastSlaResumeTime = new Date().toISOString();
        // Shift SLA Target time forward to account for paused duration
        if (slaPausedTime) {
          const pausedDurMs = new Date().getTime() - new Date(slaPausedTime).getTime();
          if (ticket.slaResolutionTarget) {
            const nextTarget = new Date(new Date(ticket.slaResolutionTarget).getTime() + pausedDurMs);
            ticket.slaResolutionTarget = nextTarget.toISOString();
          }
          if (ticket.slaResponseTarget) {
            const nextResp = new Date(new Date(ticket.slaResponseTarget).getTime() + pausedDurMs);
            ticket.slaResponseTarget = nextResp.toISOString();
          }
        }
      }
    }

    const updates: Partial<Ticket> = {
      status: newStatus,
      slaPaused,
      slaPausedTime,
      lastSlaResumeTime
    };

    if (newStatus === IncidentStatus.RESOLVED) {
      updates.resolutionNotes = optionalNote || ticket.resolutionNotes || 'Resolved cleanly by NetOps Team.';
    }

    const updated = db.updateTicket(id, updates, triggerUserId);

    if (optionalNote) {
      db.createComment({
        ticketId: id,
        userId: triggerUserId,
        content: `**Status transition to ${newStatus}**: ${optionalNote}`,
        isInternal: ticket.type === TicketType.INCIDENT && newStatus === IncidentStatus.WAITING_ON_CUSTOMER ? false : true
      });
    }

    // SLA automatic events check on Resolve
    if (newStatus === IncidentStatus.RESOLVED || newStatus === RequestStatus.COMPLETED || newStatus === ProblemStatus.RESOLVED || newStatus === ChangeStatus.COMPLETED) {
      const nowMs = new Date().getTime();
      let resMet: SLAStatus = SLAStatus.MET;
      if (ticket.slaResolutionTarget && nowMs > new Date(ticket.slaResolutionTarget).getTime()) {
        resMet = SLAStatus.BREACHED;
      }
      db.updateTicket(id, { slaResolutionStatus: resMet }, triggerUserId);
    }

    return updated;
  },

  createComment: (payload: Omit<Comment, 'id' | 'createdAt'>) => {
    const newComment: Comment = {
      ...payload,
      id: `com-${generateUUID().substring(0, 6)}`,
      createdAt: new Date().toISOString()
    };
    state.comments.push(newComment);

    // If customer replies, resume ticket status
    const ticket = db.getTicketById(payload.ticketId);
    if (ticket && !payload.isInternal && ticket.status === IncidentStatus.WAITING_ON_CUSTOMER) {
      db.transitionTicket(ticket.id, IncidentStatus.IN_PROGRESS, payload.userId, 'Customer replied with comments; resuming ticket focus.');
    }

    saveDBSync();
    return newComment;
  },

  createApproval: (payload: Omit<Approval, 'id' | 'createdAt'>) => {
    const newApproval: Approval = {
      ...payload,
      id: `app-${generateUUID().substring(0, 6)}`,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    state.approvals.push(newApproval);
    saveDBSync();
    return newApproval;
  },

  decideApproval: (id: string, status: 'APPROVED' | 'REJECTED', comments: string, reviewerId: string) => {
    const index = state.approvals.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Approval record not identified');

    const approval = state.approvals[index];
    approval.status = status;
    approval.comments = comments;
    approval.decisionDate = new Date().toISOString();

    state.approvals[index] = approval;

    // Track Audit Log
    db.createAuditLog({
      userId: reviewerId,
      action: 'APPROVAL_DECIDE',
      objectType: 'APPROVAL',
      objectId: id,
      details: `CAB Change Approval decision set to: ${status} for ticket ${approval.ticketId}. Reviewer comments: "${comments}"`
    });

    // Notify ticket owner
    const ticket = db.getTicketById(approval.ticketId);
    if (ticket) {
      if (status === 'APPROVED') {
        db.createNotification({
          userId: ticket.requesterId,
          title: `CAB approved change request ${ticket.id}`,
          message: `The Change advisory board authorized release execution of "${ticket.title}".`
        });
        // Auto scheduled Normal Changes can move to Approved/Scheduled status
        db.transitionTicket(ticket.id, ChangeStatus.APPROVED, reviewerId, 'CAB reviews passed successfully.');
      } else {
        db.createNotification({
          userId: ticket.requesterId,
          title: `CAB REJECTED change request ${ticket.id}`,
          message: `A change request was vetted and rejected: "${comments}".`
        });
      }
    }

    saveDBSync();
    return approval;
  },

  createKBArticle: (payload: Omit<KBArticle, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => {
    const aId = `kb-${generateUUID().substring(0, 4)}`;
    const newArticle: KBArticle = {
      ...payload,
      id: aId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.kbArticles.push(newArticle);

    db.createAuditLog({
      userId: payload.authorId,
      action: 'KB_CREATE',
      objectType: 'KNOWLEDGE',
      objectId: aId,
      details: `KB Article "${payload.title}" created with status ${payload.status}.`
    });

    saveDBSync();
    return newArticle;
  },

  createAuditLog: (payload: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const log: AuditLog = {
      ...payload,
      id: `aud-${generateUUID()}`,
      timestamp: new Date().toISOString()
    };
    state.auditLogs.unshift(log); // Track new on top
    return log;
  },

  createNotification: (payload: Omit<Notification, 'id' | 'status' | 'createdAt'>) => {
    const n = {
      ...payload,
      id: `not-${generateUUID().substring(0, 6)}`,
      status: 'UNREAD' as const,
      createdAt: new Date().toISOString()
    };
    state.notifications.push(n);
    saveDBSync();
    return n;
  },

  markNotificationsRead: (userId: string) => {
    state.notifications = state.notifications.map(n => n.userId === userId ? { ...n, status: 'READ' as const } : n);
    saveDBSync();
  },

  // Mock Engine ticking for periodic SLA breach checks
  checkSLABreaches: () => {
    const nowMs = new Date().getTime();
    let updatedCount = 0;

    state.tickets = state.tickets.map(t => {
      let responseBreached = t.responseBreached;
      let resolutionBreached = t.resolutionBreached;
      
      // If still active, compare SLA targets to now
      if (t.slaResponseStatus === SLAStatus.IN_PROGRESS && t.slaResponseTarget) {
        if (nowMs > new Date(t.slaResponseTarget).getTime()) {
          t.slaResponseStatus = SLAStatus.BREACHED;
          responseBreached = true;
          updatedCount++;
          // SLA notify trigger (To Help Desk Lead / Manager)
          db.createNotification({
            userId: 'usr-admin-jack',
            title: `SLA RESPONSE BREACH: ${t.id}`,
            message: `Priority ${t.priority} ticket "${t.title}" missed immediate response timing targets.`
          });
        }
      }

      if (t.slaResolutionStatus === SLAStatus.IN_PROGRESS && t.slaResolutionTarget && !t.slaPaused) {
        if (nowMs > new Date(t.slaResolutionTarget).getTime()) {
          t.slaResolutionStatus = SLAStatus.BREACHED;
          resolutionBreached = true;
          updatedCount++;
          db.createNotification({
            userId: 'usr-admin-jack',
            title: `SLA RESOLUTION BREACH: ${t.id}`,
            message: `Priority ${t.priority} ticket "${t.title}" has officially breached critical ITIL SLA bounds.`
          });
        }
      }

      return {
        ...t,
        responseBreached,
        resolutionBreached
      };
    });

    if (updatedCount > 0) {
      saveDBSync();
    }
  }
};
