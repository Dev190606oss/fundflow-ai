import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all clients
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      include: {
        projects: true,
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clientsWithStats = clients.map((c) => {
      const totalBilled = c.invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = c.invoices.reduce((sum, i) => sum + i.paidAmount, 0);
      const outstanding = totalBilled - totalPaid;
      return {
        ...c,
        totalBilled,
        totalPaid,
        outstanding,
      };
    });

    res.json(clientsWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// Create client
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, projectDetails, contractAmount, startDate, deadline, projectStatus, paymentStatus } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Client name and email are required.' });
      return;
    }

    const client = await prisma.client.create({
      data: {
        userId: req.userId!,
        name,
        email,
        phone: phone || null,
        company: company || null,
        projectDetails: projectDetails || null,
        contractAmount: Number(contractAmount) || 0,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        projectStatus: projectStatus || 'Active',
        paymentStatus: paymentStatus || 'Pending',
      },
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client.' });
  }
});

// Get client by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        projects: true,
        invoices: {
          include: { items: true },
          orderBy: { issueDate: 'desc' },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client details.' });
  }
});

// Update client
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, projectDetails, contractAmount, startDate, deadline, projectStatus, paymentStatus } = req.body;

    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        phone: phone !== undefined ? phone : existing.phone,
        company: company !== undefined ? company : existing.company,
        projectDetails: projectDetails !== undefined ? projectDetails : existing.projectDetails,
        contractAmount: contractAmount !== undefined ? Number(contractAmount) : existing.contractAmount,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : existing.deadline,
        projectStatus: projectStatus || existing.projectStatus,
        paymentStatus: paymentStatus || existing.paymentStatus,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

// Delete client
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    await prisma.client.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

// Create project for a client
router.post('/:id/projects', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, budget, deadline, status, deliverables, milestones } = req.body;
    const clientId = req.params.id;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId: req.userId!,
        clientId,
        title,
        description,
        budget: Number(budget) || 0,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'In Progress',
        deliverables: typeof deliverables === 'object' ? JSON.stringify(deliverables) : deliverables,
        milestones: typeof milestones === 'object' ? JSON.stringify(milestones) : milestones,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

export default router;
