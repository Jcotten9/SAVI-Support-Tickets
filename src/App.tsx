/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Settings, User, Users,
  LogOut, Database, Search, FileText, BookOpen, Plus, Send, Calendar,
  TrendingUp, BarChart3, FileSpreadsheet, Layers, Shield, ShieldAlert,
  HelpCircle, Activity, Bell, CornerDownRight, MoreVertical, Check, X,
  ChevronRight, UserPlus, Cpu, Laptop, Phone, HelpCircle as QuestionMarkIcon,
  CheckCircle, ArrowRight, Layers as CMDBIcon, RefreshCw, ExternalLink
} from 'lucide-react';
import {
  UserRole, TicketType, SLAStatus, IncidentStatus, RequestStatus,
  ProblemStatus, ChangeStatus, KBArticleStatus, User as ITSMUser,
  Team, Site, Service, Asset, Ticket, Comment, KBArticle, Approval,
  AuditLog, Notification, CatalogItem
} from './types/itsm';

export default function App() {
  /**
   * --- SESSION STATE MANAGER ---
   */
  const [currentUser, setCurrentUser] = useState<ITSMUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loaded metadata indices
  const [users, setUsers] = useState<ITSMUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  
  // Dynamic business lists
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reportsMetrics, setReportsMetrics] = useState<any>(null);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);

  // Filter triggers
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Active Details Modals
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{
    ticket: Ticket;
    comments: Comment[];
    auditLogs: AuditLog[];
    approvals: Approval[];
  } | null>(null);

  // Operation dialog togglers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Form parameters: Comment inputs
  const [commentContent, setCommentContent] = useState('');
  const [commentIsInternal, setCommentIsInternal] = useState(false);

  // Form parameters: Status Transition input prompt
  const [isTransitionPromptOpen, setIsTransitionPromptOpen] = useState(false);
  const [targetTransitionStatus, setTargetTransitionStatus] = useState('');
  const [transitionNote, setTransitionNote] = useState('');

  // New ticket state builder
  const [newTicketType, setNewTicketType] = useState<TicketType>(TicketType.INCIDENT);
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    priority: 'P3' as const,
    impact: 'SCHEDULED_UPGRADE' as const,
    urgency: 'MEDIUM' as const,
    status: 'NEW',
    relatedAssetId: '',
    relatedServiceId: '',
    relatedSiteId: '',
    tags: [] as string[],
    internalNotes: '',
    customerNotes: '',
    catalogItemId: '',
    formFields: {} as Record<string, any>,
    riskLevel: 'LOW' as const,
    changeType: 'NORMAL' as const,
    implementationPlan: '',
    backoutPlan: '',
    testPlan: ''
  });

  // KB Article Creation
  const [isCreateKBOpen, setIsCreateKBOpen] = useState(false);
  const [newKBData, setNewKBData] = useState({
    title: '',
    summary: '',
    content: '',
    environment: '',
    symptoms: '',
    cause: '',
    resolution: '',
    workaround: '',
    relatedServices: [] as string[],
    relatedAssets: [] as string[],
    tags: '',
    isInternal: false
  });

  // Current Running UTC Clock state
  const [systemClock, setSystemClock] = useState<string>('');

  /**
   * --- CHRONOMETRY EFFECTS ---
   */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setSystemClock(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * --- DATA SYNC WORKSPACE ---
   */
  const fetchData = async () => {
    try {
      const [u, t, s, sv, a, cat, tk, ap, rep, kb] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/teams').then(r => r.json()),
        fetch('/api/sites').then(r => r.json()),
        fetch('/api/services').then(r => r.json()),
        fetch('/api/assets').then(r => r.json()),
        fetch('/api/catalog').then(r => r.json()),
        fetch('/api/tickets').then(r => r.json()),
        fetch('/api/approvals').then(r => r.json()),
        fetch('/api/reports').then(r => r.json()),
        fetch('/api/kb').then(r => r.json())
      ]);

      setUsers(u);
      setTeams(t);
      setSites(s);
      setServices(sv);
      setAssets(a);
      setCatalogItems(cat);
      setTickets(tk);
      setApprovals(ap);
      setReportsMetrics(rep);
      setKbArticles(kb);

      if (currentUser) {
        const nots = await fetch(`/api/notifications/${currentUser.id}`).then(r => r.json());
        setNotifications(nots);
      }
    } catch (err) {
      console.error('Error fetching REST entities:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Regular refresh interval (Every 10 seconds for real reactive response clocks)
    const syncInt = setInterval(() => {
      fetchData();
      if (selectedTicketId) {
        fetchTicketDetails(selectedTicketId);
      }
    }, 10000);
    return () => clearInterval(syncInt);
  }, [currentUser, selectedTicketId]);

  // Read ticket breakdown
  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const payload = await res.json();
        setTicketDetails(payload);
      }
    } catch (err) {
      console.error('Failure fetching ticket details:', err);
    }
  };

  const handleTicketClick = (id: string) => {
    setSelectedTicketId(id);
    fetchTicketDetails(id);
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/${currentUser.id}/read`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * --- CORE EVENTS HANDLING ---
   */

  const triggerErrorAlert = (message: string) => {
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const handlePersonaLogin = (user: ITSMUser) => {
    setCurrentUser(user);
    // Standard role redirects for premium UX workflow
    if (user.role === UserRole.REQUESTER) {
      setActiveTab('catalog');
    } else if (user.role === UserRole.PROBLEM_MANAGER) {
      setActiveTab('problems');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    setSelectedTicketId(null);
    setTicketDetails(null);
  };

  // Create Ticket Submit
  const handleCreateTicketSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let subStatus = 'NEW';
    if (newTicketType === TicketType.SERVICE_REQUEST) {
      subStatus = 'SUBMITTED';
    } else if (newTicketType === TicketType.PROBLEM) {
      subStatus = 'NEW';
    }

    const payload = {
      title: newTicketData.title,
      description: newTicketData.description,
      type: newTicketType,
      priority: newTicketData.priority,
      impact: newTicketData.impact,
      urgency: newTicketData.urgency,
      status: subStatus,
      requesterId: currentUser.id,
      assignedTeamId: newTicketType === TicketType.INCIDENT ? 'team-t1-servicedesk' : undefined,
      relatedAssetId: newTicketData.relatedAssetId || undefined,
      relatedServiceId: newTicketData.relatedServiceId || undefined,
      relatedSiteId: newTicketData.relatedSiteId || undefined,
      tags: newTicketData.tags,
      internalNotes: newTicketData.internalNotes || undefined,
      customerNotes: newTicketData.customerNotes || undefined,
      catalogItemId: newTicketType === TicketType.SERVICE_REQUEST ? newTicketData.catalogItemId : undefined,
      requestFormData: newTicketType === TicketType.SERVICE_REQUEST ? newTicketData.formFields : undefined,
      riskLevel: newTicketType === TicketType.CHANGE ? newTicketData.riskLevel : undefined,
      changeType: newTicketType === TicketType.CHANGE ? newTicketData.changeType : undefined,
      implementationPlan: newTicketType === TicketType.CHANGE ? newTicketData.implementationPlan : undefined,
      backoutPlan: newTicketType === TicketType.CHANGE ? newTicketData.backoutPlan : undefined,
      testPlan: newTicketType === TicketType.CHANGE ? newTicketData.testPlan : undefined,
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setIsCreateModalOpen(false);
        // Reset
        setNewTicketData({
          title: '', description: '', priority: 'P3', impact: 'SCHEDULED_UPGRADE', urgency: 'MEDIUM',
          status: 'NEW', relatedAssetId: '', relatedServiceId: '', relatedSiteId: '', tags: [],
          internalNotes: '', customerNotes: '', catalogItemId: '', formFields: {}, riskLevel: 'LOW',
          changeType: 'NORMAL', implementationPlan: '', backoutPlan: '', testPlan: ''
        });
        fetchData();
        handleTicketClick(created.id);
      } else {
        const err = await res.json();
        triggerErrorAlert(err.error || 'Failed to create ticket.');
      }
    } catch (err: any) {
      triggerErrorAlert(err.message || 'Error occurred.');
    }
  };

  // Submit Comments
  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedTicketId || !commentContent.trim()) return;

    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          content: commentContent,
          isInternal: commentIsInternal
        })
      });

      if (res.ok) {
        setCommentContent('');
        fetchTicketDetails(selectedTicketId);
        fetchData();
      } else {
        const err = await res.json();
        triggerErrorAlert(err.error);
      }
    } catch (err: any) {
      triggerErrorAlert(err.message);
    }
  };

  // State Transition Actions Enforcer
  const handleTransitionClick = (status: string) => {
    setTargetTransitionStatus(status);
    setTransitionNote('');
    setIsTransitionPromptOpen(true);
  };

  const handleConfirmTransition = async () => {
    if (!currentUser || !selectedTicketId) return;

    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetTransitionStatus,
          triggerUserId: currentUser.id,
          note: transitionNote
        })
      });

      if (res.ok) {
        setIsTransitionPromptOpen(false);
        fetchTicketDetails(selectedTicketId);
        fetchData();
      } else {
        const err = await res.json();
        setIsTransitionPromptOpen(false);
        triggerErrorAlert(`ITIL Validation Guard Alert: ${err.error}`);
      }
    } catch (err: any) {
      setIsTransitionPromptOpen(false);
      triggerErrorAlert(err.message);
    }
  };

  // Submit Approval Decisions
  const handleApprovalSubmit = async (approvalId: string, decision: 'APPROVED' | 'REJECTED', comments: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          comments,
          reviewerId: currentUser.id
        })
      });

      if (res.ok) {
        if (selectedTicketId) fetchTicketDetails(selectedTicketId);
        fetchData();
      } else {
        const err = await res.json();
        triggerErrorAlert(err.error);
      }
    } catch (err: any) {
      triggerErrorAlert(err.message);
    }
  };

  // Knowledge Publish
  const handlePublishKBArticle = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newKBData.title,
          summary: newKBData.summary,
          content: newKBData.content,
          environment: newKBData.environment || undefined,
          symptoms: newKBData.symptoms || undefined,
          cause: newKBData.cause || undefined,
          resolution: newKBData.resolution || undefined,
          workaround: newKBData.workaround || undefined,
          relatedServices: newKBData.relatedServices,
          relatedAssets: newKBData.relatedAssets,
          tags: newKBData.tags.split(',').map(t => t.trim()).filter(Boolean),
          authorId: currentUser.id,
          status: KBArticleStatus.PUBLISHED,
          isInternal: newKBData.isInternal,
          version: 1
        })
      });

      if (res.ok) {
        setIsCreateKBOpen(false);
        setNewKBData({
          title: '', summary: '', content: '', environment: '', symptoms: '',
          cause: '', resolution: '', workaround: '', relatedServices: [],
          relatedAssets: [], tags: '', isInternal: false
        });
        fetchData();
        setActiveTab('kb');
      } else {
        const err = await res.json();
        triggerErrorAlert(err.error);
      }
    } catch (err: any) {
      triggerErrorAlert(err.message);
    }
  };

  // SLA clock colors resolver
  const getSLAIndicator = (ticket: Ticket) => {
    if (ticket.slaResolutionStatus === SLAStatus.BREACHED) {
      return { label: 'SLA BREACHED', bg: 'bg-red-100 text-red-800 border-red-200 animate-pulse' };
    }
    if (ticket.slaResolutionStatus === SLAStatus.MET) {
      return { label: 'SLA MET', bg: 'bg-green-100 text-green-800 border-green-200' };
    }
    if (ticket.slaPaused) {
      return { label: 'SLA PAUSED', bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
    return { label: 'SLA ACTIVE', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
  };

  // Convert ticket Priority into styled pill
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wide';
      case 'P2': return 'bg-orange-500 text-white font-semibold px-2 py-0.5 rounded text-[10px]';
      case 'P3': return 'bg-yellow-500 text-slate-900 font-medium px-2 py-0.5 rounded text-[10px]';
      default: return 'bg-blue-500 text-white px-2 py-0.5 rounded text-[10px]';
    }
  };

  // Convert ticket Type into styled tag
  const getTypeBadge = (type: TicketType) => {
    switch (type) {
      case TicketType.INCIDENT: return 'bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium';
      case TicketType.SERVICE_REQUEST: return 'bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium';
      case TicketType.PROBLEM: return 'bg-purple-100 text-purple-800 border border-purple-200 rounded-full px-2.5 py-0.5 text-[11px] font-medium';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200 rounded-full px-2.5 py-0.5 text-[11px]';
    }
  };

  // Convert resolved Incidents into Knowledge draft presets
  const convertIncidentToKBDraft = (inc: Ticket) => {
    setNewKBData({
      title: `KEDB Fix: Resolution for ${inc.title}`,
      summary: `Documented solution stemming from Incident record ${inc.id}`,
      content: `### Summary Symptoms\n${inc.symptoms || inc.description}\n\n### Diagnosis Cause\n${inc.rootCauseCandidate || 'Awaiting structural core diagnosis.'}\n\n### Final Step-By-Step Resolution\n${inc.resolutionNotes || '1. Connect to command module.\n2. Apply configuration payload updates.'}`,
      environment: sites.find(s => s.id === inc.relatedSiteId)?.name || 'Multi-office workstation cluster.',
      symptoms: inc.symptoms || inc.description,
      cause: inc.rootCauseCandidate || '',
      resolution: inc.resolutionNotes || '',
      workaround: inc.workaround || '',
      relatedServices: inc.relatedServiceId ? [inc.relatedServiceId] : [],
      relatedAssets: inc.relatedAssetId ? [inc.relatedAssetId] : [],
      tags: inc.tags.join(', '),
      isInternal: false
    });
    setIsCreateKBOpen(true);
  };

  // Compute calculated remaining hours for SLA
  const computeSLARemaining = (targetStr?: string) => {
    if (!targetStr) return '--';
    const distMs = new Date(targetStr).getTime() - new Date().getTime();
    if (distMs < 0) return 'BREACHED';
    const hrs = Math.floor(distMs / 3600000);
    const mins = Math.floor((distMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  // Filtered lists logic
  const filteredTickets = tickets.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    
    // Quick Workspace global query filtering
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      const isMatch = t.id.toLowerCase().includes(q) ||
                      t.title.toLowerCase().includes(q) ||
                      t.description.toLowerCase().includes(q) ||
                      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));
      if (!isMatch) return false;
    }
    
    return true;
  });

  const activeCatalogTickets = tickets.filter(t => t.type === TicketType.SERVICE_REQUEST && t.catalogItemId);

  /**
   * --- RENDER ENGINE ---
   */

  if (!currentUser) {
    // 1. High-Fidelity Persona Setup Welcome Screen
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-slate-100">
        <div className="max-w-4xl w-full text-center mb-10">
          <div className="inline-flex items-center gap-3 bg-slate-800 text-sky-400 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-slate-700/60 mb-4 shadow-xl">
            <Shield className="w-4 h-4 fill-sky-500/20" /> Verified ITIL 4 Service Desk Systems active
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-black tracking-tight text-white mb-3">
            SAVI iQ Support Management
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Enterprise IT Service Management (ITSM) system. Emulate roles across our IT support ecosystem to test SLA compliance, state machines, and standard support operations.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="https://support.savicontrols.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors bg-slate-800/40 hover:bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700/50"
            >
              <span>Access SAVI Controls Support Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://crm.savicontrols.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors bg-slate-800/40 hover:bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700/50"
            >
              <span>Access SAVI CRM Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Dynamic Personas Selection Grid */}
        <div className="max-w-6xl w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {users.filter(u => u.role !== UserRole.CHANGE_MANAGER).map(u => {
            const team = teams.find(t => t.id === u.teamId);
            return (
              <button
                key={u.id}
                onClick={() => handlePersonaLogin(u)}
                className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-sky-500/50 p-5 rounded-xl text-left transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-sky-950/20 flex flex-col justify-between h-48 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                    alt={u.username}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-slate-700 group-hover:border-sky-400 transition"
                  />
                  <div>
                    <h3 className="font-sans font-bold text-white group-hover:text-sky-400 transition text-sm">
                      {u.username}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                      {u.role.replace('SUPPORT_AGENT_', '')}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {team ? team.description : 'Administrative oversight & audit compliance reviews.'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Enter Workspace</span>
                  <ChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-slate-500 text-xs font-mono">
          SYSTEM CLOCK: <span className="text-slate-400">{systemClock}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* 2. Primary Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 md:min-h-screen flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-sky-400" />
            <div>
              <span className="font-sans font-black tracking-wider text-sm text-white">APEX</span>
              <span className="font-sans text-xs text-slate-400 ml-1">ITSM</span>
            </div>
          </div>
          <div className="text-[10px] bg-sky-950 text-sky-400 border border-sky-900 px-1.5 py-0.5 rounded font-mono">
            v4.1
          </div>
        </div>

        {/* Current Active Persona card */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-3">
          <img
            src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
            alt={currentUser.username}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full border border-sky-500/20"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-white truncate">{currentUser.username}</div>
            <div className="text-[9px] text-sky-400 font-mono uppercase tracking-widest truncate">
              {currentUser.role.replace('SUPPORT_AGENT_', '')}
            </div>
          </div>
          <button
            onClick={handleLogOut}
            title="Log Out / Switch Role"
            className="text-slate-500 hover:text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="p-3 space-y-1 flex-1">
          {currentUser.role !== UserRole.REQUESTER && (
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedTicketId(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Activity className="w-4 h-4" /> Team Dashboard
            </button>
          )}

          <button
            onClick={() => { setActiveTab('tickets'); setSelectedTicketId(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'tickets' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FileText className="w-4 h-4" /> All Active Queue
          </button>

          <button
            onClick={() => { setActiveTab('catalog'); setSelectedTicketId(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'catalog' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <UserPlus className="w-4 h-4" /> Service Catalog
          </button>

          {currentUser.role !== UserRole.REQUESTER && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase">ITIL Processes</div>

              <button
                onClick={() => { setActiveTab('tickets'); setFilterType(TicketType.INCIDENT); setSelectedTicketId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'tickets' && filterType === TicketType.INCIDENT ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <AlertCircle className="w-4 h-4" /> Incident Management
              </button>

              <button
                onClick={() => { setActiveTab('problems'); setSelectedTicketId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'problems' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <AlertTriangle className="w-4 h-4" /> Problem Management
              </button>
            </>
          )}

          <div className="pt-2 pb-1 px-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase">Knowledge & CMDB</div>

          <button
            onClick={() => { setActiveTab('kb'); setSelectedTicketId(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'kb' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <BookOpen className="w-4 h-4" /> Knowledge Base (KEDB)
          </button>

          <button
            onClick={() => { setActiveTab('cmdb'); setSelectedTicketId(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'cmdb' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <CMDBIcon className="w-4 h-4" /> CMDB Asset Registry
          </button>

          {currentUser.role !== UserRole.REQUESTER && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase">Reporting</div>

              <button
                onClick={() => { setActiveTab('reports'); setSelectedTicketId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${activeTab === 'reports' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <BarChart3 className="w-4 h-4" /> SLA Reports
              </button>
            </>
          )}
        </nav>

        {/* Support Portal Link */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 space-y-2">
          <a
            href="https://support.savicontrols.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors bg-slate-950/40 hover:bg-slate-950/80 p-2 rounded border border-slate-800/50"
          >
            <span>SAVI Support Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://crm.savicontrols.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors bg-slate-950/40 hover:bg-slate-950/80 p-2 rounded border border-slate-800/50"
          >
            <span>SAVI CRM Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Local Sync Indicator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex flex-col gap-1 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
            <span className="text-slate-400">DB PERSISTED OK</span>
          </div>
          <div className="text-[9px] text-slate-500">{systemClock}</div>
        </div>
      </aside>

      {/* Primary Workspace Window */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Upper Header strip */}
        <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          
          {/* Global search */}
          <div className="relative w-64 md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search active tickets, assets, KB..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFilterQuery(e.target.value);
                if (activeTab !== 'tickets' && e.target.value) {
                  setActiveTab('tickets');
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-300 transition"
            />
          </div>

          <div className="flex items-center gap-4">
            
            {/* Direct Create Action for Agents */}
            {currentUser.role !== UserRole.REQUESTER && (
              <button
                onClick={() => { setNewTicketType(TicketType.INCIDENT); setIsCreateModalOpen(true); }}
                className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-lg shadow-sky-500/10"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" /> Create Ticket
              </button>
            )}

            {/* Notifications Alert Panel */}
            <div className="relative group">
              <button
                onClick={markAllNotificationsRead}
                className="p-1 text-slate-400 hover:text-white transition relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => n.status === 'UNREAD') && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                )}
              </button>
              
              {/* Flyout dropdown */}
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition duration-300 z-50 p-3 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                  <span>UNREAD ALERTS ({notifications.filter(n => n.status === 'UNREAD').length})</span>
                  <button className="text-sky-400 hover:underline text-[10px]" onClick={markAllNotificationsRead}>Dismiss All</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">No active alerts.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-2 rounded text-[11px] border ${n.status === 'UNREAD' ? 'bg-slate-950/40 border-sky-500/20 text-slate-200' : 'border-slate-800/50 text-slate-400'}`}>
                        <div className="font-semibold">{n.title}</div>
                        <p className="mt-0.5 mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="mt-1 text-[9px] font-mono text-slate-500">{new Date(n.createdAt).toLocaleTimeString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-sky-500" />
              Role: <span className="text-slate-300 font-semibold">{currentUser.role}</span>
            </div>

          </div>
        </header>

        {/* Screen Switch Board */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (filterType || '')}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              
              {/* === TAB: TEAM DASHBOARD === */}
              {activeTab === 'dashboard' && reportsMetrics && (
                <div className="space-y-6">
                  
                  {/* Metric Ribbon boxes */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="text-slate-500 text-xs font-medium">TOTAL MANAGED SYSTEMS</div>
                      <div className="text-2xl font-black mt-1 text-white">{reportsMetrics.total} Tickets</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span> Live operational pools
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="text-slate-500 text-xs font-medium">SLA COMPLIANCE</div>
                      <div className="text-2xl font-black mt-1 text-emerald-400">{reportsMetrics.slaCompliance}%</div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 relative overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${reportsMetrics.slaCompliance}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="text-slate-500 text-xs font-medium">OPEN INCIDENTS STACK</div>
                      <div className="text-2xl font-black mt-1 text-amber-500">{reportsMetrics.types.incidents}</div>
                      <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Includes high-priority outages
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="text-slate-500 text-xs font-medium">ACTIVE SLA CLOCK RISKS</div>
                      <div className="text-2xl font-black mt-1 text-red-400">{reportsMetrics.slaBreachedCount} Breaches</div>
                      <div className="text-[10px] text-slate-400 mt-1">Requiring rapid desk dispatch</div>
                    </div>
                  </div>

                  {/* Charts & Actions Row */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* Visual custom SVG graphs */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl xl:col-span-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-sans font-bold text-sm tracking-wide text-white">Created vs Resolved SLA Dynamics</h3>
                        <span className="text-[10px] font-mono text-slate-500">REALTIME MONITOR</span>
                      </div>
                      <div className="h-48 mt-6 flex items-end justify-between px-2 relative min-w-0">
                        {/* Grid Background */}
                        <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
                          <div className="border-b border-slate-800/60 w-full h-0"></div>
                          <div className="border-b border-slate-800/60 w-full h-0"></div>
                          <div className="border-b border-slate-800/60 w-full h-0"></div>
                          <div className="border-b border-slate-800/60 w-full h-0"></div>
                        </div>

                        {/* Bar charts columns represent priorities */}
                        <div className="flex flex-col items-center gap-1 z-10 w-1/4">
                          <div className="w-12 bg-red-500/80 rounded-t-lg transition hover:bg-red-500" style={{ height: `${Math.max(15, reportsMetrics.priority.P1 * 35)}px` }}></div>
                          <span className="text-[10px] font-semibold font-mono text-slate-400">P1 Outages</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 z-10 w-1/4">
                          <div className="w-12 bg-orange-500/80 rounded-t-lg transition hover:bg-orange-500" style={{ height: `${Math.max(15, reportsMetrics.priority.P2 * 35)}px` }}></div>
                          <span className="text-[10px] font-semibold font-mono text-slate-400">P2 Critical</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 z-10 w-1/4">
                          <div className="w-12 bg-yellow-500/80 rounded-t-lg transition hover:bg-yellow-500" style={{ height: `${Math.max(15, reportsMetrics.priority.P3 * 35)}px` }}></div>
                          <span className="text-[10px] font-semibold font-mono text-slate-400">P3 Medium</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 z-10 w-1/4">
                          <div className="w-12 bg-blue-500/80 rounded-t-lg transition hover:bg-blue-500" style={{ height: `${Math.max(15, reportsMetrics.priority.P4 * 35)}px` }}></div>
                          <span className="text-[10px] font-semibold font-mono text-slate-400">P4 Standard</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="font-sans font-bold text-sm tracking-wide text-white">Active Desk SLA Focus</h3>
                        <p className="text-xs text-slate-400 mt-1">My team open queues priority lists.</p>
                      </div>
                      <div className="space-y-3 mt-4 flex-1">
                        {tickets.slice(0, 3).map(tk => (
                          <button
                            key={tk.id}
                            onClick={() => handleTicketClick(tk.id)}
                            className="w-full text-left bg-slate-950/50 hover:bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] text-slate-500 font-mono block">{tk.id}</span>
                              <span className="text-xs font-semibold text-slate-200 block truncate">{tk.title}</span>
                            </div>
                            <span className={getPriorityBadge(tk.priority)}>{tk.priority}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { setActiveTab('tickets'); }}
                        className="w-full text-center bg-slate-950 hover:bg-slate-900 border border-slate-850 py-2 rounded-xl text-xs font-medium text-sky-400 transition cursor-pointer mt-4"
                      >
                        Launch Incident Queue View
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* === TAB: TICKETS QUEUES === */}
              {activeTab === 'tickets' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                        {filterType ? `${filterType} Management Desk` : 'Unified IT Service Queue'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Triaged support ticket records under active ITSM protocols.</p>
                    </div>

                    {/* Quick Filters toolbar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-sky-500"
                      >
                        <option value="">All Categories</option>
                        <option value={TicketType.INCIDENT}>Incidents</option>
                        <option value={TicketType.SERVICE_REQUEST}>Service Requests</option>
                        <option value={TicketType.PROBLEM}>Problems</option>
                      </select>

                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                      >
                        <option value="">All Priorities</option>
                        <option value="P1">P1 Critical</option>
                        <option value="P2">P2 High</option>
                        <option value="P3">P3 Medium</option>
                        <option value="P4">P4 Low</option>
                      </select>

                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                      >
                        <option value="">All Statuses</option>
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                        <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
                      </select>
                    </div>
                  </div>

                  {/* High Density Tickets Grid Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-mono text-[10px] tracking-wider uppercase">
                            <th className="p-4 font-medium">TICKET ID / TYPE</th>
                            <th className="p-4 font-medium">SUMMARY</th>
                            <th className="p-4 font-medium">PRIORITY</th>
                            <th className="p-4 font-medium">STATUS</th>
                            <th className="p-4 font-medium">REQUESTER</th>
                            <th className="p-4 font-medium">TEAM ASSIGNED</th>
                            <th className="p-4 font-medium">SLA REMAINING</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {filteredTickets.map(tk => {
                            const slaInfo = getSLAIndicator(tk);
                            const reqUser = users.find(u => u.id === tk.requesterId);
                            const assignedTeam = teams.find(t => t.id === tk.assignedTeamId);

                            return (
                              <tr
                                key={tk.id}
                                onClick={() => handleTicketClick(tk.id)}
                                className="hover:bg-slate-950/40 cursor-pointer transition duration-150"
                              >
                                <td className="p-4 font-mono">
                                  <div className="text-sky-400 font-semibold">{tk.id}</div>
                                  <div className="mt-1">{getTypeBadge(tk.type)}</div>
                                </td>
                                
                                <td className="p-4 pr-10">
                                  <div className="font-semibold text-slate-200 line-clamp-1">{tk.title}</div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{tk.description}</div>
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {tk.tags && tk.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400">#{tag}</span>
                                    ))}
                                  </div>
                                </td>

                                <td className="p-4">
                                  <span className={getPriorityBadge(tk.priority)}>{tk.priority}</span>
                                </td>

                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tk.status === 'CLOSED' ? 'bg-slate-950 text-slate-500 border border-slate-850' : tk.status === 'RESOLVED' || tk.status === 'COMPLETED' ? 'bg-green-950 text-green-400 border border-green-900/50' : 'bg-slate-850 text-slate-300'}`}>
                                    {tk.status.replace('_', ' ')}
                                  </span>
                                </td>

                                <td className="p-4 text-slate-350">
                                  {reqUser ? reqUser.username : 'Unknown'}
                                </td>

                                <td className="p-4 text-slate-400 font-medium">
                                  {assignedTeam ? assignedTeam.name.replace('Tier ', 'T') : 'Central Triage'}
                                </td>

                                <td className="p-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-mono border ${slaInfo.bg}`}>
                                    {computeSLARemaining(tk.slaResolutionTarget)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {filteredTickets.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-slate-500 italic">No tickets located matching filter selection.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB: SERVICE CATALOG === */}
              {activeTab === 'catalog' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-sky-400" /> Enterprise Service Catalog
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Request pre-authorized hardware provisioning or identity license entitlements standard workflow engines.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {catalogItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg"
                      >
                        <div>
                          <div className="w-10 h-10 bg-sky-950 border border-sky-900/50 rounded-xl flex items-center justify-center text-sky-400 mb-4">
                            {item.icon === 'UserPlus' && <UserPlus className="w-5 h-5" />}
                            {item.icon === 'ShieldAlert' && <ShieldAlert className="w-5 h-5" />}
                            {item.icon === 'Cpu' && <Cpu className="w-5 h-5" />}
                          </div>
                          <h3 className="font-sans font-bold text-sm text-white mb-2">{item.name}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                        </div>

                        <button
                          onClick={() => {
                            setNewTicketType(TicketType.SERVICE_REQUEST);
                            setNewTicketData({
                              ...newTicketData,
                              title: `Request Fulfill: ${item.name}`,
                              catalogItemId: item.id,
                              priority: 'P3', // Requests are usually P3
                              tags: ['Catalog-Order', item.name.split(' ')[0]]
                            });
                            setIsCreateModalOpen(true);
                          }}
                          className="mt-6 w-full text-center bg-slate-950 hover:bg-slate-850 hover:text-sky-300 border border-slate-800 py-2 rounded-xl text-xs font-semibold text-sky-400 transition cursor-pointer"
                        >
                          Initiate Request Workflow
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Active Orders List */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mt-8">
                    <h3 className="font-sans font-bold text-sm text-white mb-4">My Placed Request Fulfilment Clocks</h3>
                    <div className="space-y-3">
                      {activeCatalogTickets.map(ord => (
                        <div
                          key={ord.id}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block mb-1">{ord.id}</span>
                            <h4 className="text-xs font-bold text-slate-200">{ord.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-1">Status: <span className="font-semibold text-emerald-400 uppercase">{ord.status}</span></p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500">SLA Due: {new Date(ord.dueDate || '').toLocaleDateString()}</span>
                            <button
                              onClick={() => handleTicketClick(ord.id)}
                              className="bg-slate-900 hover:bg-slate-850 px-2.5 py-1 rounded text-[11px] font-semibold text-sky-400 border border-slate-800 cursor-pointer"
                            >
                              Inspect Order Detail
                            </button>
                          </div>
                        </div>
                      ))}
                      {activeCatalogTickets.length === 0 && (
                        <div className="text-center py-6 text-slate-500 italic text-xs">No active order loops recorded in this sandbox yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB: PROBLEM BOARD === */}
              {activeTab === 'problems' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-purple-400" /> ITIL 4 Problem Management
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-sans">Eliminate recurring incidents through thorough root cause analysis and Known Error indexing.</p>
                    </div>
                    <button
                      onClick={() => { setNewTicketType(TicketType.PROBLEM); setIsCreateModalOpen(true); }}
                      className="bg-purple-500 hover:bg-purple-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-lg"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Log Problem
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {tickets.filter(t => t.type === TicketType.PROBLEM).map(pr => (
                      <div
                        key={pr.id}
                        className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-xl"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] text-slate-500 font-mono">{pr.id}</span>
                            <span className={getPriorityBadge(pr.priority)}>{pr.priority}</span>
                          </div>
                          
                          <h3 className="font-sans font-semibold text-sm text-white mb-2">{pr.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">{pr.description}</p>
                          
                          {/* RCA Block info if logged */}
                          {(pr.rootCauseAnalysis || pr.workaround) && (
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 mt-2">
                              {pr.rootCauseAnalysis && (
                                <div className="text-[11px]">
                                  <span className="font-bold text-purple-400 block font-mono">ROOT CAUSE IDENTIFIED:</span>
                                  <p className="text-slate-350 italic text-[11px] mt-0.5">{pr.rootCauseAnalysis}</p>
                                </div>
                              )}
                              {pr.workaround && (
                                <div className="text-[11px] border-t border-slate-800/60 pt-1.5">
                                  <span className="font-bold text-sky-400 block font-mono">WORKAROUND PRESET:</span>
                                  <p className="text-slate-350 text-[11px] mt-0.5">{pr.workaround}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-mono">Status: <span className="font-semibold text-purple-400 uppercase">{pr.status}</span></span>
                          <button
                            onClick={() => handleTicketClick(pr.id)}
                            className="text-sky-400 hover:underline font-semibold cursor-pointer"
                          >
                            Open Detailed RCA $\to$
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* === TAB: KNOWLEDGE BASE === */}
              {activeTab === 'kb' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-sky-400" /> Knowledge Base Index
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-sans">Search and deploy pre-vetted support documentation from the KEDB.</p>
                    </div>

                    <button
                      onClick={() => setIsCreateKBOpen(true)}
                      className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-lg shadow-sky-500/10"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Write Article
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {kbArticles.map(art => (
                      <div
                        key={art.id}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700/80 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-3.5 pb-2 border-b border-slate-800/65">
                            <span>{art.id} • V{art.version}</span>
                            <span className="text-emerald-400">PUBLISHED</span>
                          </div>

                          <h3 className="font-sans font-bold text-sm text-slate-100 hover:text-sky-400 transition mb-2">
                            {art.title}
                          </h3>
                          <p className="text-xs text-slate-450 leading-relaxed mb-4">{art.summary}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {art.tags.map(tag => (
                              <span key={tag} className="bg-slate-950 px-2 py-0.5 rounded text-[9px] font-mono text-slate-500">#{tag}</span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs">
                          <span className="text-[10px] text-slate-500 font-mono">By Analyst Alice</span>
                          <button
                            onClick={() => {
                              // Trigger article display inside an alert modal for simplicity
                              triggerErrorAlert(`[${art.id}] ${art.title}\n\n${art.content.replace(/#/g, '')}`);
                            }}
                            className="bg-slate-950 hover:bg-slate-850 px-2.5 py-1 rounded text-sky-400 border border-slate-850 cursor-pointer"
                          >
                            Read Document
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === TAB: CMDB ASSETS === */}
              {activeTab === 'cmdb' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <CMDBIcon className="w-5 h-5 text-sky-400" /> CONFIGURATION MANAGEMENT DATABASE (CMDB)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Audit and navigate dependency linkages for core corporate cloud servers and network equipment assets.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Index list */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:col-span-1 space-y-2">
                      <h3 className="text-slate-400 text-xs font-mono mb-3 uppercase tracking-wider">CI INDEX SYSTEM</h3>
                      {assets.map(a => (
                        <div
                          key={a.id}
                          className="w-full text-left bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex flex-col gap-1 text-xs"
                        >
                          <span className="text-[10px] text-slate-500 font-mono block">{a.id}</span>
                          <h4 className="font-bold text-slate-200 line-clamp-1">{a.name}</h4>
                          <span className="text-[10px] text-slate-400 italic block">{a.type}</span>
                        </div>
                      ))}
                    </div>

                    {/* Right detailed dependency diagram schema */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-3">
                      <h3 className="font-sans font-bold text-sm text-white mb-4">Core Asset Operational Dependency Map</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.map(ast => {
                          const matchingSite = sites.find(s => s.id === ast.siteId);
                          return (
                            <div key={ast.id} className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] text-slate-500 font-mono">{ast.id}</span>
                                  <h4 className="text-xs font-bold text-slate-200 mt-0.5">{ast.name}</h4>
                                </div>
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">ACTIVE</span>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                                <div>Address: <span className="text-slate-300 font-sans">{ast.ipAddress || 'Not applicable'}</span></div>
                                <div>Vendor model: <span className="text-slate-300 font-sans">{ast.model} ({ast.vendor})</span></div>
                                <div>Location: <span className="text-slate-300 font-sans">{matchingSite ? matchingSite.name : 'Remote Deployment'}</span></div>
                              </div>

                              {ast.relatedServices.length > 0 && (
                                <div className="border-t border-slate-850 pt-2.5">
                                  <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Impacted services mapping:</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ast.relatedServices.map(svcId => {
                                      const svc = services.find(s => s.id === svcId);
                                      return (
                                        <span key={svcId} className="bg-slate-900 text-sky-400 text-[10px] border border-slate-800 px-2 py-0.5 rounded font-sans">
                                          {svc ? svc.name : svcId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB: REPORTS PERFORMANCE === */}
              {activeTab === 'reports' && reportsMetrics && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-sans font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-sky-400" /> ITIL performance reporting
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Track operational service desk compliance indexes and SLA benchmarks.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <h3 className="font-sans font-bold text-sm text-white mb-4">SLA Compliance Index Target Met</h3>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full border-[8px] border-slate-800 flex items-center justify-center text-xl font-black text-sky-400 relative">
                          {reportsMetrics.slaCompliance}%
                        </div>
                        <div className="text-xs text-slate-400 space-y-1.5">
                          <p>• Internal SLA response rate threshold: **90%**</p>
                          <p>• Current operational level: **{reportsMetrics.slaCompliance}%**</p>
                          <p className="text-emerald-400 font-semibold">• Health assessment: Compliant with ITIL SLAs</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <h3 className="font-sans font-bold text-sm text-white mb-4">Incident Aging Breakdown</h3>
                      <div className="space-y-3 font-sans text-xs">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                          <span className="text-slate-400">Aging Backlogs (&gt; 24h)</span>
                          <span className="font-bold text-white">{reportsMetrics.agingIncidentsCount} tickets</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-slate-450">Total Open queue capacity</span>
                          <span className="font-bold text-white">{tickets.filter(t => t.status !== 'CLOSED').length} tickets</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. TICKET DETAILS FLYOUT SIDEBAR / COMPONENT */}
      <AnimatePresence>
        {selectedTicketId && ticketDetails && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="w-full md:w-[500px] border-l border-slate-800 bg-slate-900 md:min-h-screen overflow-y-auto flex flex-col shrink-0 z-50 shadow-2xl relative"
          >
            {/* Header toolbar */}
            <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">{ticketDetails.ticket.id}</span>
                <span className="text-xs font-bold text-white uppercase">{ticketDetails.ticket.type} DETAILS</span>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="p-1 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700/80 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main content body details */}
            <div className="p-5 space-y-6 flex-1">
              
              {/* Title & Status block */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={getPriorityBadge(ticketDetails.ticket.priority)}>{ticketDetails.ticket.priority}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${ticketDetails.ticket.status === 'CLOSED' ? 'bg-slate-950 text-slate-550 border border-slate-850' : 'bg-slate-800 text-slate-200'}`}>
                    {ticketDetails.ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-100">{ticketDetails.ticket.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed mt-2.5 bg-slate-950/30 p-3 rounded-lg border border-slate-850">{ticketDetails.ticket.description}</p>
              </div>

              {/* Status transition dynamic flow control pathways */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 mb-2">ITSM STATE MACHINE CONTROL</div>
                
                <div className="flex flex-wrap gap-1.5">
                  {ticketDetails.ticket.type === TicketType.INCIDENT && (
                    <>
                      {ticketDetails.ticket.status === IncidentStatus.NEW && (
                        <button
                          onClick={() => handleTransitionClick(IncidentStatus.ACKNOWLEDGED)}
                          className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      
                      {ticketDetails.ticket.status !== IncidentStatus.RESOLVED && ticketDetails.ticket.status !== IncidentStatus.CLOSED && (
                        <>
                          <button
                            onClick={() => handleTransitionClick(IncidentStatus.WAITING_ON_CUSTOMER)}
                            className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-900/40 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Wait on Customer
                          </button>
                          <button
                            onClick={() => handleTransitionClick(IncidentStatus.RESOLVED)}
                            className="bg-green-500 hover:bg-green-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Resolve Incident
                          </button>
                        </>
                      )}

                      {ticketDetails.ticket.status === IncidentStatus.RESOLVED && (
                        <>
                          <button
                            onClick={() => handleTransitionClick(IncidentStatus.CLOSED)}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Close Ticket File
                          </button>
                          
                          {/* Knowledge Draft feature */}
                          <button
                            onClick={() => convertIncidentToKBDraft(ticketDetails.ticket)}
                            className="bg-sky-950 border border-sky-900/60 text-sky-400 hover:bg-sky-900 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Compile KB Draft
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {ticketDetails.ticket.type === TicketType.SERVICE_REQUEST && (
                    <>
                      {ticketDetails.ticket.status === RequestStatus.SUBMITTED && (
                        <button
                          onClick={() => handleTransitionClick(RequestStatus.UNDER_REVIEW)}
                          className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                        >
                          Send to Review
                        </button>
                      )}
                      {ticketDetails.ticket.status === RequestStatus.UNDER_REVIEW && (
                        <button
                          onClick={() => handleTransitionClick(RequestStatus.IN_FULFILLMENT)}
                          className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                        >
                          Execute Fulfillment
                        </button>
                      )}
                      {ticketDetails.ticket.status === RequestStatus.IN_FULFILLMENT && (
                        <button
                          onClick={() => handleTransitionClick(RequestStatus.COMPLETED)}
                          className="bg-green-500 hover:bg-green-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                        >
                          Complete Fulfillment
                        </button>
                      )}
                    </>
                  )}

                  {ticketDetails.ticket.type === TicketType.PROBLEM && (
                    <>
                      {ticketDetails.ticket.status === ProblemStatus.NEW && (
                        <button
                          onClick={() => handleTransitionClick(ProblemStatus.INVESTIGATING)}
                          className="bg-purple-500 hover:bg-purple-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                        >
                          Start Investigation
                        </button>
                      )}
                      {ticketDetails.ticket.status === ProblemStatus.INVESTIGATING && (
                        <>
                          <button
                            onClick={() => handleTransitionClick(ProblemStatus.KNOWN_ERROR)}
                            className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-900/40 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Mark Known Error
                          </button>
                          <button
                            onClick={() => handleTransitionClick(ProblemStatus.RESOLVED)}
                            className="bg-green-500 hover:bg-green-600 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition"
                          >
                            Resolve Problem
                          </button>
                        </>
                      )}
                      {ticketDetails.ticket.status === ProblemStatus.RESOLVED && (
                        <button
                          onClick={() => handleTransitionClick(ProblemStatus.CLOSED)}
                          className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold px-2.5 py-1"
                        >
                          Close Problem
                        </button>
                      )}
                    </>
                  )}


                </div>
              </div>

              {/* Related metadata block layout info cards */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                
                {ticketDetails.ticket.relatedServiceId && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider block">CMDB SERVICE</span>
                    <span className="font-semibold text-slate-200 block truncate mt-1">
                      {services.find(s => s.id === ticketDetails.ticket.relatedServiceId)?.name || 'Central Platform Service'}
                    </span>
                  </div>
                )}

                {ticketDetails.ticket.relatedAssetId && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider block">AFFECTED CI ASSET</span>
                    <span className="font-semibold text-slate-200 block truncate mt-1">
                      {assets.find(a => a.id === ticketDetails.ticket.relatedAssetId)?.name || 'Virtual Node Server'}
                    </span>
                  </div>
                )}

                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider block">SLA countdown clock:</span>
                    <span className="text-xs font-bold text-slate-300 mt-1 block">
                      Response: {computeSLARemaining(ticketDetails.ticket.slaResponseTarget)} | Resolution: {computeSLARemaining(ticketDetails.ticket.slaResolutionTarget)}
                    </span>
                  </div>
                  {ticketDetails.ticket.slaPaused && (
                    <span className="bg-yellow-950 text-yellow-400 border border-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">CLOCK PAUSED</span>
                  )}
                </div>

              </div>

              {/* Dynamic linked tickets */}
              <div className="space-y-2 border-t border-slate-850 pt-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">ITIL Linked Process records:</div>
                <div className="space-y-1.5 text-xs font-medium">
                  {ticketDetails.ticket.linkedTickets && ticketDetails.ticket.linkedTickets.map(lnkId => (
                    <div key={lnkId} className="flex justify-between items-center bg-slate-950 p-2 border border-slate-850 rounded">
                      <span>Related ticket: <span className="font-semibold text-sky-400">{lnkId}</span></span>
                      <button onClick={() => { handleTicketClick(lnkId); }} className="text-slate-400 hover:text-white transition">Inspect</button>
                    </div>
                  ))}
                  {(!ticketDetails.ticket.linkedTickets || ticketDetails.ticket.linkedTickets.length === 0) && (
                    <div className="text-slate-500 text-[10px] italic">No active structural joins or linked threads for this ticket.</div>
                  )}
                </div>
              </div>

              {/* Chat Comments Stream - Public and Internal */}
              <div className="space-y-4 border-t border-slate-850 pt-4">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Comments Log Stream ({ticketDetails.comments.length})</span>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded font-mono">Agent + Customer workspace</span>
                </div>

                <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                  {ticketDetails.comments.map(com => {
                    const comUser = users.find(u => u.id === com.userId);
                    return (
                      <div
                        key={com.id}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 ${com.isInternal ? 'bg-amber-950/20 border-amber-900/30' : 'bg-slate-950/60 border-slate-850'}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
                          <span className="font-semibold text-slate-300">
                            {comUser ? comUser.username : 'Unknown'} • <span className="text-slate-500 font-normal">{comUser?.role.replace('SUPPORT_AGENT_', '')}</span>
                          </span>
                          <span className="text-[9px] text-slate-500">{new Date(com.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{com.content}</p>
                        {com.isInternal && (
                          <div className="text-[9px] text-amber-500 font-semibold uppercase tracking-widest mt-1">🔒 INTERNAL WORKSPACE NOTES</div>
                        )}
                      </div>
                    );
                  })}
                  {ticketDetails.comments.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500 italic">No notes logged yet. Use the publisher container below.</div>
                  )}
                </div>

                {/* Comment composer form */}
                <form onSubmit={handleAddComment} className="space-y-2.5">
                  <textarea
                    placeholder="Provide troubleshooting details, updates, or reply to customer..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300 placeholder-slate-500"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-slate-400 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commentIsInternal}
                        onChange={(e) => setCommentIsInternal(e.target.checked)}
                        className="rounded accent-sky-500 bg-slate-950 border-slate-800"
                      />
                      Is internal support note only
                    </label>
                    <button
                      type="submit"
                      className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xl"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Comment
                    </button>
                  </div>
                </form>
              </div>

              {/* Trace Audit Log Trail details */}
              <div className="space-y-3.5 border-t border-slate-850 pt-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">ITIL Audit trace logs:</div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {ticketDetails.auditLogs.map(log => (
                    <div key={log.id} className="text-[11px] bg-slate-950/40 p-2 rounded border border-slate-850 text-slate-400 font-sans">
                      <div className="flex justify-between font-mono text-[9px] text-slate-500 mb-1 leading-none">
                        <span>{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p>{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MODAL DETAILED PANELS CONTAINER */}

      {/* CREATE TICKET DIALOG */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h3 className="font-sans font-bold text-sm text-white">Create New Enterprise ITSM ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Type toggle selection box */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">Sovereign SLA Ticket Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[TicketType.INCIDENT, TicketType.SERVICE_REQUEST, TicketType.PROBLEM].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewTicketType(type)}
                      className={`py-2 text-center rounded-lg text-xs font-bold uppercase transition cursor-pointer ${newTicketType === type ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 hover:bg-slate-850 border border-slate-805 text-slate-350'}`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Desc */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Standard summary title</label>
                  <input
                    type="text"
                    required
                    value={newTicketData.title}
                    onChange={(e) => setNewTicketData({ ...newTicketData, title: e.target.value })}
                    placeholder="Brief description of incident, problem or change..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Structural description details</label>
                  <textarea
                    required
                    value={newTicketData.description}
                    onChange={(e) => setNewTicketData({ ...newTicketData, description: e.target.value })}
                    placeholder="Provide thorough symptoms diagnostics logs..."
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300"
                  />
                </div>
              </div>

              {/* Incidents priority metrics builder details */}
              {newTicketType === TicketType.INCIDENT && (
                <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Urgency impact index:</label>
                    <select
                      value={newTicketData.urgency}
                      onChange={(e: any) => setNewTicketData({ ...newTicketData, urgency: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Impact index tier:</label>
                    <select
                      value={newTicketData.impact}
                      onChange={(e: any) => setNewTicketData({ ...newTicketData, impact: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300"
                    >
                      <option value="COMPLETE_OUTAGE">Complete outage</option>
                      <option value="IMPACTING_REVENUE">Impacting Revenue</option>
                      <option value="SCHEDULED_UPGRADE">Can be scheduled for Upgrade</option>
                    </select>
                  </div>
                  <div className="col-span-2 text-[10px] text-sky-400 font-mono italic">
                    *ITIL Note: The P1-P4 priority tier is automatically calculated using the system matrix calculations.
                  </div>
                </div>
              )}

              {/* Linked assets and mapping configs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Related Service</label>
                  <select
                    value={newTicketData.relatedServiceId}
                    onChange={(e) => setNewTicketData({ ...newTicketData, relatedServiceId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                  >
                    <option value="">None / Global Platform</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Related Asset</label>
                  <select
                    value={newTicketData.relatedAssetId}
                    onChange={(e) => setNewTicketData({ ...newTicketData, relatedAssetId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                  >
                    <option value="">None / Virtual Asset</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>



              {/* Service Catalog Dynamic form fields renderer */}
              {newTicketType === TicketType.SERVICE_REQUEST && newTicketData.catalogItemId && (
                <div className="bg-emerald-950/20 p-4 border border-emerald-900/40 rounded-xl space-y-3.5">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest leading-none mb-1">Dynamic Request Configuration:</div>
                  {catalogItems.find(i => i.id === newTicketData.catalogItemId)?.fields.map(f => (
                    <div key={f.name}>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          required={f.required}
                          onChange={(e) => setNewTicketData({
                            ...newTicketData,
                            formFields: { ...newTicketData.formFields, [f.name]: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                        >
                          <option value="">Select option...</option>
                          {f.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          required={f.required}
                          rows={2}
                          onChange={(e) => setNewTicketData({
                            ...newTicketData,
                            formFields: { ...newTicketData.formFields, [f.name]: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                        />
                      ) : (
                        <input
                          type="text"
                          required={f.required}
                          onChange={(e) => setNewTicketData({
                            ...newTicketData,
                            formFields: { ...newTicketData.formFields, [f.name]: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-505 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-semibold px-5 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  Submit Into Workspace
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* STATE MACHINE TRANSITION CONFIRM PROMPT */}
      {isTransitionPromptOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h3 className="font-sans font-bold text-sm text-slate-100">Confirm ITIL Status Transition</h3>
              <button onClick={() => setIsTransitionPromptOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                You are transitioning this ITSM record status to: <span className="font-bold text-sky-400 uppercase">{targetTransitionStatus.replace('_', ' ')}</span>.
              </p>

              {/* Resolution Close notes input box */}
              {(targetTransitionStatus === IncidentStatus.RESOLVED || targetTransitionStatus === ProblemStatus.KNOWN_ERROR) && (
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Troubleshooting Resolution / Close Notes (Required)</label>
                  <textarea
                    required
                    placeholder="Provide troubleshooting performed details, diagnosis fixes, or workaround prescriptions to active KEDB..."
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300"
                  />
                </div>
              )}

              {targetTransitionStatus === IncidentStatus.WAITING_ON_CUSTOMER && (
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Inquiry Question to Customer (Required)</label>
                  <textarea
                    required
                    placeholder="What clarifications or logs are required from customer? This will automatic pause SLA clocks."
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransitionPromptOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2 border border-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransition}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold px-5 py-2 rounded-xl cursor-pointer shadow-lg"
                >
                  Confirm and transition
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* CREATE KNOWLEDGE BASE ARTICLE DIALOG */}
      {isCreateKBOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h3 className="font-sans font-bold text-sm text-slate-100">Write New KEDB/KM Article</h3>
              <button onClick={() => setIsCreateKBOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handlePublishKBArticle} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
              
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Article descriptive title</label>
                <input
                  type="text"
                  required
                  placeholder="Resetting enterprise passwords, VPN resolving configurations..."
                  value={newKBData.title}
                  onChange={(e) => setNewKBData({ ...newKBData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Summary Abstract</label>
                <input
                  type="text"
                  required
                  placeholder="A concise, high-level overview of symptoms and fix criteria..."
                  value={newKBData.summary}
                  onChange={(e) => setNewKBData({ ...newKBData, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Resolution Procedures (Markdown allowed)</label>
                <textarea
                  required
                  placeholder="Detailed instructions step-by-step walkthroughs..."
                  value={newKBData.content}
                  onChange={(e) => setNewKBData({ ...newKBData, content: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Tags (Comma separated list)</label>
                  <input
                    type="text"
                    placeholder="VPN, Firewall, UserRegistry"
                    value={newKBData.tags}
                    onChange={(e) => setNewKBData({ ...newKBData, tags: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Environment Scope</label>
                  <input
                    type="text"
                    placeholder="macOS, Linux servers, Chicago office grid..."
                    value={newKBData.environment}
                    onChange={(e) => setNewKBData({ ...newKBData, environment: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateKBOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2 border border-slate-850 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-505 bg-sky-550 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold px-5 py-2 rounded-xl cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  Publish to KEDB
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* STANDARD ERROR/INFO DIALOG MODAL */}
      {isAlertOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4 text-slate-300">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30 text-white font-bold text-xs uppercase tracking-wider">
              <span>ITSM Protocol Notice</span>
              <button onClick={() => setIsAlertOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap">{alertMessage}</p>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setIsAlertOpen(false)}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-955 text-slate-950 text-xs font-bold px-5 py-2 rounded-lg cursor-pointer transition"
                >
                  Acknowledge Notification
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
