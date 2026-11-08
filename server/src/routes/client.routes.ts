import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody, createClientSchema, updateClientSchema } from '../middleware/validate.middleware';

const router = Router();

// Get all clients for authenticated user
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

// Create client (with strict validation)
router.post(
  '/',
  requireAuth,
  validateBody(createClientSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, company, projectDetails, contractAmount, startDate, deadline, projectStatus, paymentStatus } = req.body;

      const client = await prisma.client.create({
        data: {
          userId: req.userId!,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          company: company ? company.trim() : null,
          projectDetails: projectDetails ? projectDetails.trim() : null,
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
  }
);

// Get client by ID (Enforces strict ownership)
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

// Update client (Enforces ownership & prevents IDOR)
router.put(
  '/:id',
  requireAuth,
  validateBody(updateClientSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      where: { id: existing.id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(email && { email: String(email).trim().toLowerCase() }),
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
        company: company !== undefined ? (company ? String(company).trim() : null) : existing.company,
        projectDetails: projectDetails !== undefined ? (projectDetails ? String(projectDetails).trim() : null) : existing.projectDetails,
        contractAmount: contractAmount !== undefined ? Math.max(0, Number(contractAmount)) : existing.contractAmount,
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

// Delete client (Enforces ownership)
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
      where: { id: existing.id },
    });

    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

// Create project for a client (Enforces ownership)
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
        clientId: client.id,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        budget: Math.max(0, Number(budget) || 0),
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
