/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { TicketType } from './src/types/itsm';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard JSON and URL form parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Regular SLA target breach tick cycle (Every 30 seconds)
  setInterval(() => {
    try {
      db.checkSLABreaches();
    } catch (err) {
      console.error('SLA clock process fault:', err);
    }
  }, 30000);

  /**
   * --- REST API PORTAL ---
   */

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // REST API Auth Endpoint
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email parameter required.' });
        return;
      }

      // Simple lookup by email/username
      const user = db.getUsers().find(
        u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid enterprise credentials or user not provisioned.' });
        return;
      }

      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Static Metadata Databases
  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  app.get('/api/teams', (req, res) => {
    res.json(db.getTeams());
  });

  app.get('/api/sites', (req, res) => {
    res.json(db.getSites());
  });

  app.get('/api/services', (req, res) => {
    res.json(db.getServices());
  });

  app.get('/api/assets', (req, res) => {
    res.json(db.getAssets());
  });

  app.get('/api/catalog', (req, res) => {
    res.json(db.getCatalogItems());
  });

  // Fetch Tickets List with Query Filters
  app.get('/api/tickets', (req, res) => {
    try {
      const { type, status, priority, requesterId, assignedAgentId, assignedTeamId, search } = req.query;
      let tickets = db.getTickets();

      if (type) {
        tickets = tickets.filter(t => t.type === type);
      }
      if (status) {
        tickets = tickets.filter(t => t.status === status);
      }
      if (priority) {
        tickets = tickets.filter(t => t.priority === priority);
      }
      if (requesterId) {
        tickets = tickets.filter(t => t.requesterId === requesterId);
      }
      if (assignedAgentId) {
        tickets = tickets.filter(t => t.assignedAgentId === assignedAgentId);
      }
      if (assignedTeamId) {
        tickets = tickets.filter(t => t.assignedTeamId === assignedTeamId);
      }
      if (search) {
        const query = (search as string).toLowerCase();
        tickets = tickets.filter(
          t => t.id.toLowerCase().includes(query) ||
               t.title.toLowerCase().includes(query) ||
               t.description.toLowerCase().includes(query)
        );
      }

      // Sort with newest created at top
      tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json(tickets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Distinct Ticket Detail Record plus dependencies
  app.get('/api/tickets/:id', (req, res) => {
    try {
      const { id } = req.params;
      const ticket = db.getTicketById(id);
      if (!ticket) {
        res.status(404).json({ error: `Ticket search failed for ID: ${id}` });
        return;
      }

      const comments = db.getComments(id);
      const auditLogs = db.getAuditLogs(id);
      const approvals = db.getApprovalsByTicket(id);

      res.json({
        ticket,
        comments,
        auditLogs,
        approvals
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Ticket entry
  app.post('/api/tickets', (req, res) => {
    try {
      const ticket = db.createTicket(req.body);
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Edit general parameter patches
  app.patch('/api/tickets/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { updates, triggerUserId } = req.body;
      if (!triggerUserId) {
        res.status(400).json({ error: 'Header tracking: triggerUserId is required.' });
        return;
      }
      const updated = db.updateTicket(id, updates, triggerUserId);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // State Transition enforcing ITIL state machine regulations
  app.post('/api/tickets/:id/transition', (req, res) => {
    try {
      const { id } = req.params;
      const { status, triggerUserId, note } = req.body;
      if (!status || !triggerUserId) {
        res.status(400).json({ error: 'Parameters target: status and triggerUserId are required.' });
        return;
      }
      const updated = db.transitionTicket(id, status, triggerUserId, note);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message }); // Sends explicit rule violations back to UI
    }
  });

  // Append User / Agent Comment
  app.post('/api/tickets/:id/comments', (req, res) => {
    try {
      const { id } = req.params;
      const { userId, content, isInternal } = req.body;
      if (!userId || !content) {
        res.status(400).json({ error: 'Parameters target: userId and content are required.' });
        return;
      }
      const newComment = db.createComment({
        ticketId: id,
        userId,
        content,
        isInternal: !!isInternal
      });
      res.status(201).json(newComment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Retrieve Approvals
  app.get('/api/approvals', (req, res) => {
    res.json(db.getApprovals());
  });

  // Submit Approval Decision
  app.post('/api/approvals/:id/decide', (req, res) => {
    try {
      const { id } = req.params;
      const { status, comments, reviewerId } = req.body;
      if (!status || !reviewerId) {
        res.status(400).json({ error: 'Parameters target: status and reviewerId are required.' });
        return;
      }
      const updatedApproval = db.decideApproval(id, status, comments, reviewerId);
      res.json(updatedApproval);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Knowledge base search & Publish
  app.get('/api/kb', (req, res) => {
    try {
      const { search } = req.query;
      let articles = db.getKBArticles();
      if (search) {
        const query = (search as string).toLowerCase();
        articles = articles.filter(
          a => a.title.toLowerCase().includes(query) ||
               a.summary.toLowerCase().includes(query) ||
               a.content.toLowerCase().includes(query) ||
               a.tags.some(t => t.toLowerCase().includes(query))
        );
      }
      res.json(articles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/kb', (req, res) => {
    try {
      const newArticle = db.createKBArticle(req.body);
      res.status(201).json(newArticle);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Notifications API
  app.get('/api/notifications/:userId', (req, res) => {
    res.json(db.getNotifications(req.params.userId));
  });

  app.post('/api/notifications/:userId/read', (req, res) => {
    db.markNotificationsRead(req.params.userId);
    res.json({ success: true });
  });

  // Analytics Engine Reports
  app.get('/api/reports', (req, res) => {
    try {
      const tickets = db.getTickets();
      const assets = db.getAssets();

      // Computations
      const totalCount = tickets.length;
      const incidentsCount = tickets.filter(t => t.type === TicketType.INCIDENT).length;
      const requestsCount = tickets.filter(t => t.type === TicketType.SERVICE_REQUEST).length;
      const changesCount = tickets.filter(t => t.type === TicketType.CHANGE).length;
      const problemsCount = tickets.filter(t => t.type === TicketType.PROBLEM).length;

      // SLAs breach metrics
      const breaches = tickets.filter(t => t.slaResolutionStatus === 'BREACHED').length;
      const slaCompliance = totalCount > 0 ? Math.round(((totalCount - breaches) / totalCount) * 100) : 100;

      // Priority spread
      const priorityWeights = {
        P1: tickets.filter(t => t.priority === 'P1').length,
        P2: tickets.filter(t => t.priority === 'P2').length,
        P3: tickets.filter(t => t.priority === 'P3').length,
        P4: tickets.filter(t => t.priority === 'P4').length,
      };

      // Ticket aging categorization
      let openIncidents = tickets.filter(t => t.type === TicketType.INCIDENT && t.status !== 'CLOSED');
      let agingIncidents = openIncidents.filter(t => {
        const ageMs = new Date().getTime() - new Date(t.createdAt).getTime();
        return ageMs > 24 * 3600000; // Age above 24 hours
      }).length;

      // Assets statistics
      const assetTypes = assets.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        total: totalCount,
        types: {
          incidents: incidentsCount,
          requests: requestsCount,
          changes: changesCount,
          problems: problemsCount
        },
        slaCompliance,
        slaBreachedCount: breaches,
        priority: priorityWeights,
        agingIncidentsCount: agingIncidents,
        assetTypes
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * --- MIDDLEWARE INTEGRATION (VITE & STATIC ASSETS) ---
   */

  if (process.env.NODE_ENV !== 'production') {
    // Development server: Serve Vite dev compiler
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production build: Static distribution asset server
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[APEX ITSM ENGINE] Active and receiving secure channels on port ${PORT}`);
  });
}

startServer();
