import 'dotenv/config';
import { PrismaClient, InvoiceStatus, PaymentMethod, PaymentStatus, LoanType, LoanStatus, InvestmentCategory, OpportunityStatus, NotificationType, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for FundFlow AI...');

  // Clean existing demo data if any
  await prisma.notification.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.savingsContribution.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.investmentOpportunity.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payPalTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Create Demo User
  const user = await prisma.user.create({
    data: {
      email: 'demo@fundflow.ai',
      passwordHash,
      name: 'Alex Mercer',
      businessName: 'Vanguard Engineering & Design',
      currency: 'INR',
    },
  });

  console.log(`👤 Created Demo User: ${user.email} (${user.id})`);

  // 2. Create 3 Clients
  const client1 = await prisma.client.create({
    data: {
      userId: user.id,
      name: 'Nexus Digital Works',
      email: 'billing@nexusdigital.io',
      phone: '+91 98765 43210',
      company: 'Nexus Software Ltd',
      projectDetails: 'Cloud infrastructure migration and Next.js frontend redesign',
      contractAmount: 120000,
      startDate: new Date('2026-01-10'),
      deadline: new Date('2026-04-15'),
      projectStatus: 'Active',
      paymentStatus: 'Partially Paid',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      userId: user.id,
      name: 'Starlight Media Agency',
      email: 'accounts@starlightmedia.com',
      phone: '+91 98111 22334',
      company: 'Starlight Creative Media Pvt Ltd',
      projectDetails: 'Interactive 3D landing page and CMS backend integration',
      contractAmount: 85000,
      startDate: new Date('2026-02-01'),
      deadline: new Date('2026-03-30'),
      projectStatus: 'Active',
      paymentStatus: 'Pending',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      userId: user.id,
      name: 'Horizon FinCorp',
      email: 'finance@horizonfincorp.org',
      phone: '+91 99223 34455',
      company: 'Horizon Financial Technologies',
      projectDetails: 'Algorithmic trading dashboard and WebSocket integration',
      contractAmount: 150000,
      startDate: new Date('2026-02-15'),
      deadline: new Date('2026-05-30'),
      projectStatus: 'Active',
      paymentStatus: 'Pending',
    },
  });

  // Projects
  await prisma.project.create({
    data: {
      userId: user.id,
      clientId: client1.id,
      title: 'Cloud Infrastructure & Dashboard Re-architecture',
      description: 'Modernizing legacy monolith into serverless microservices with real-time UI.',
      budget: 120000,
      deadline: new Date('2026-04-15'),
      status: 'In Progress',
      deliverables: JSON.stringify([
        'AWS ECS setup with Terraform',
        'Next.js 15 App router dashboard',
        'Redis cache layer with sub-10ms response',
        'Automated CI/CD pipelines',
      ]),
      milestones: JSON.stringify([
        { title: 'Sprint 1: Architecture & Auth', amount: 35000, status: 'Completed' },
        { title: 'Sprint 2: Dashboard UI & Data Layer', amount: 50000, status: 'In Progress' },
        { title: 'Sprint 3: CI/CD & Final Handoff', amount: 35000, status: 'Pending' },
      ]),
    },
  });

  await prisma.project.create({
    data: {
      userId: user.id,
      clientId: client2.id,
      title: 'Starlight Interactive Brand Portal',
      description: 'High performance Three.js dynamic portfolio and client CMS.',
      budget: 85000,
      deadline: new Date('2026-03-30'),
      status: 'In Progress',
      deliverables: JSON.stringify([
        'Interactive 3D Canvas showcase',
        'Payload CMS headless backend',
        'SEO optimization and Lighthouse 95+ score',
      ]),
    },
  });

  // 3. Create 5 Sample Invoices (2 Paid, 2 Pending, 1 Overdue)
  const inv1 = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client1.id,
      invoiceNumber: 'INV-2026-001',
      issueDate: new Date('2026-01-15'),
      dueDate: new Date('2026-01-30'),
      status: InvoiceStatus.PAID,
      subtotal: 35000,
      taxRate: 18,
      taxAmount: 6300,
      discountAmount: 1300,
      totalAmount: 40000,
      paidAmount: 40000,
      notes: 'Sprint 1 milestone completion. Thank you for your partnership!',
      items: {
        create: [
          { description: 'Cloud infrastructure provisioning & Docker architecture', quantity: 1, unitPrice: 20000, amount: 20000 },
          { description: 'Authentication flow & RBAC setup', quantity: 1, unitPrice: 15000, amount: 15000 },
        ],
      },
    },
  });

  const payment1 = await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      userId: user.id,
      amount: 40000,
      paymentMethod: PaymentMethod.PAYPAL,
      transactionId: 'PAYPAL-SANDBOX-7X98214M',
      status: PaymentStatus.COMPLETED,
      paidAt: new Date('2026-01-28'),
    },
  });

  await prisma.payPalTransaction.create({
    data: {
      userId: user.id,
      paymentId: payment1.id,
      orderId: 'ORDER-SANDBOX-9832187A',
      captureId: 'CAPTURE-SANDBOX-7X98214M',
      payerEmail: 'client-buyer@nexusdigital.io',
      payerId: 'PAYER-991204',
      amount: 40000,
      currency: 'INR',
      status: 'COMPLETED',
      rawResponse: JSON.stringify({ status: 'COMPLETED', intent: 'CAPTURE', id: 'CAPTURE-SANDBOX-7X98214M' }),
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client2.id,
      invoiceNumber: 'INV-2026-002',
      issueDate: new Date('2026-02-05'),
      dueDate: new Date('2026-02-20'),
      status: InvoiceStatus.PAID,
      subtotal: 25000,
      taxRate: 18,
      taxAmount: 4500,
      discountAmount: 500,
      totalAmount: 29000,
      paidAmount: 29000,
      notes: 'Initial discovery and UI design sprints.',
      items: {
        create: [
          { description: 'Wireframing, UX Figma prototype & Design System', quantity: 1, unitPrice: 25000, amount: 25000 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      userId: user.id,
      amount: 29000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      transactionId: 'NEFT-8893104921',
      status: PaymentStatus.COMPLETED,
      paidAt: new Date('2026-02-18'),
    },
  });

  // Pending 1
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client3.id,
      invoiceNumber: 'INV-2026-003',
      issueDate: new Date('2026-10-25'),
      dueDate: new Date(Date.now() + 10 * 86400000), // Due in 10 days
      status: InvoiceStatus.PENDING,
      subtotal: 50000,
      taxRate: 18,
      taxAmount: 9000,
      discountAmount: 0,
      totalAmount: 59000,
      paidAmount: 0,
      notes: 'High-frequency data pipeline architecture phase 1.',
      items: {
        create: [
          { description: 'WebSocket streaming backend & orderbook parser', quantity: 1, unitPrice: 35000, amount: 35000 },
          { description: 'Real-time charting widgets & integration', quantity: 1, unitPrice: 15000, amount: 15000 },
        ],
      },
    },
  });

  // Pending 2
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client1.id,
      invoiceNumber: 'INV-2026-004',
      issueDate: new Date('2026-10-28'),
      dueDate: new Date(Date.now() + 14 * 86400000), // Due in 14 days
      status: InvoiceStatus.PENDING,
      subtotal: 15000,
      taxRate: 18,
      taxAmount: 2700,
      discountAmount: 700,
      totalAmount: 17000,
      paidAmount: 0,
      notes: 'Database optimization and indexing sprint.',
      items: {
        create: [
          { description: 'Postgres query indexing and vacuum tuning', quantity: 1, unitPrice: 15000, amount: 15000 },
        ],
      },
    },
  });

  // Overdue
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client2.id,
      invoiceNumber: 'INV-2026-005',
      issueDate: new Date(Date.now() - 25 * 86400000),
      dueDate: new Date(Date.now() - 5 * 86400000), // Due 5 days ago
      status: InvoiceStatus.OVERDUE,
      subtotal: 20000,
      taxRate: 18,
      taxAmount: 3600,
      discountAmount: 0,
      totalAmount: 23600,
      paidAmount: 0,
      notes: 'CMS implementation deliverables - Payment is overdue.',
      items: {
        create: [
          { description: 'Payload CMS deployment and admin training', quantity: 1, unitPrice: 20000, amount: 20000 },
        ],
      },
    },
  });

  // 4. Money Lent & Repayments (2 Lending Records)
  const loanLent1 = await prisma.loan.create({
    data: {
      userId: user.id,
      type: LoanType.LENT,
      partyName: 'Rohan Sharma',
      contactInfo: 'rohan.sharma@techguild.dev | +91 98450 11223',
      principalAmount: 15000,
      interestRate: 0,
      amountRepaid: 5000,
      remainingAmount: 10000,
      startDate: new Date('2026-10-01'),
      dueDate: new Date(Date.now() + 6 * 86400000), // in 6 days
      status: LoanStatus.ACTIVE,
      notes: 'Friendly short-term bridge loan for laptop repair.',
    },
  });

  await prisma.loanRepayment.create({
    data: {
      loanId: loanLent1.id,
      amount: 5000,
      repaymentDate: new Date('2026-10-20'),
      notes: 'First installment via UPI.',
    },
  });

  const loanLent2 = await prisma.loan.create({
    data: {
      userId: user.id,
      type: LoanType.LENT,
      partyName: 'Priya Mehta',
      contactInfo: 'priya.mehta@designco.in | +91 97120 44556',
      principalAmount: 10000,
      interestRate: 0,
      amountRepaid: 10000,
      remainingAmount: 0,
      startDate: new Date('2026-09-15'),
      dueDate: new Date('2026-10-15'),
      status: LoanStatus.FULLY_REPAID,
      notes: 'Design software annual subscription share. Fully recovered.',
    },
  });

  await prisma.loanRepayment.create({
    data: {
      loanId: loanLent2.id,
      amount: 10000,
      repaymentDate: new Date('2026-10-12'),
      notes: 'Full settlement received on time.',
    },
  });

  // 5. Money Borrowed (1 Borrowing Record)
  const loanBorrowed1 = await prisma.loan.create({
    data: {
      userId: user.id,
      type: LoanType.BORROWED,
      partyName: 'Vikram Patel',
      contactInfo: 'vikram.patel@peergroup.co | +91 98230 66778',
      principalAmount: 25000,
      interestRate: 0,
      amountRepaid: 10000,
      remainingAmount: 15000,
      startDate: new Date('2026-10-10'),
      dueDate: new Date(Date.now() + 20 * 86400000), // in 20 days
      status: LoanStatus.ACTIVE,
      notes: 'Co-working security deposit advance.',
    },
  });

  await prisma.loanRepayment.create({
    data: {
      loanId: loanBorrowed1.id,
      amount: 10000,
      repaymentDate: new Date('2026-10-25'),
      notes: 'Partial repayment made via IMPS.',
    },
  });

  // 6. Investment Watchlist (3 entries, including Anthropic IPO Watch as Unverified)
  await prisma.investmentOpportunity.create({
    data: {
      userId: user.id,
      companyName: 'Anthropic IPO Watch',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
      category: InvestmentCategory.IPO,
      description: 'AI frontier lab (Claude). Tracking secondary indications & public listing speculation. Strictly unverified and educational.',
      expectedAmount: 25000,
      targetDate: new Date(Date.now() + 28 * 86400000), // 4 weeks
      priceBand: 'TBD (Private Secondary Indicative)',
      lotSize: 1,
      infoUrl: 'https://www.anthropic.com',
      status: OpportunityStatus.UNVERIFIED,
      isVerified: false,
      officialSource: 'No official SEC S-1 filed yet. Industry reports only.',
      lastVerifiedAt: new Date(),
      notes: 'Unconfirmed / Unverified. Do not treat as confirmed IPO date or pricing. Save defensively.',
    },
  });

  await prisma.investmentOpportunity.create({
    data: {
      userId: user.id,
      companyName: 'Nifty 50 Bluechip Index ETF',
      logoUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=120&auto=format&fit=crop&q=80',
      category: InvestmentCategory.ETFS,
      description: 'Systematic monthly allocation into top 50 capitalised Indian enterprise equities.',
      expectedAmount: 15000,
      targetDate: new Date(Date.now() + 15 * 86400000),
      priceBand: '₹260 - ₹275',
      lotSize: 55,
      infoUrl: 'https://www.nseindia.com',
      status: OpportunityStatus.CONFIRMED,
      isVerified: true,
      officialSource: 'NSE Official Indices & Exchange Prospectus',
      lastVerifiedAt: new Date(),
      notes: 'Disciplined wealth accumulation vehicle with minimal expense ratio (0.04%).',
    },
  });

  await prisma.investmentOpportunity.create({
    data: {
      userId: user.id,
      companyName: 'Stripe Secondary Liquidity Watch',
      logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80',
      category: InvestmentCategory.OTHER,
      description: 'Global payments leader private employee tender offer & liquidity tracking.',
      expectedAmount: 40000,
      targetDate: new Date(Date.now() + 60 * 86400000),
      priceBand: '$27.50 / share indicative',
      lotSize: 15,
      infoUrl: 'https://stripe.com',
      status: OpportunityStatus.ANNOUNCED,
      isVerified: false,
      officialSource: 'Tender offer memo & Bloomberg Technology analysis',
      lastVerifiedAt: new Date(),
      notes: 'Subject to accredited qualification & minimum platform allocation criteria.',
    },
  });

  // 7. Savings Goals (2 Goals)
  const goal1 = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      title: 'Prepare for Anthropic IPO Watch',
      targetAmount: 25000,
      currentAmount: 8000,
      targetDate: new Date(Date.now() + 28 * 86400000), // 4 weeks
      category: 'IPO Readiness',
      isCompleted: false,
    },
  });

  await prisma.savingsContribution.create({
    data: {
      goalId: goal1.id,
      amount: 5000,
      contributionDate: new Date('2026-10-15'),
      sourceNotes: 'Allocated from Nexus Digital milestone 1 payout',
    },
  });

  await prisma.savingsContribution.create({
    data: {
      goalId: goal1.id,
      amount: 3000,
      contributionDate: new Date('2026-10-25'),
      sourceNotes: 'Allocated from Starlight discovery invoice',
    },
  });

  const goal2 = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      title: 'Emergency Reserve & Tax Provision',
      targetAmount: 60000,
      currentAmount: 38000,
      targetDate: new Date(Date.now() + 60 * 86400000),
      category: 'Safety Net',
      isCompleted: false,
    },
  });

  await prisma.savingsContribution.create({
    data: {
      goalId: goal2.id,
      amount: 20000,
      contributionDate: new Date('2026-09-30'),
      sourceNotes: 'Initial quarterly reserve allocation',
    },
  });

  await prisma.savingsContribution.create({
    data: {
      goalId: goal2.id,
      amount: 18000,
      contributionDate: new Date('2026-10-20'),
      sourceNotes: 'Monthly surplus allocation',
    },
  });

  // 8. Transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: TransactionType.INCOME,
        category: 'Freelance Payout',
        description: 'Payment for Invoice INV-2026-001 (Nexus Digital)',
        amount: 40000,
        date: new Date('2026-01-28'),
        referenceId: inv1.id,
      },
      {
        userId: user.id,
        type: TransactionType.INCOME,
        category: 'Freelance Payout',
        description: 'Payment for Invoice INV-2026-002 (Starlight Media)',
        amount: 29000,
        date: new Date('2026-02-18'),
        referenceId: inv2.id,
      },
      {
        userId: user.id,
        type: TransactionType.EXPENSE,
        category: 'Cloud Services & Tooling',
        description: 'AWS Cloud hosting and GitHub Copilot / LLM API credits',
        amount: 6200,
        date: new Date('2026-10-14'),
      },
      {
        userId: user.id,
        type: TransactionType.EXPENSE,
        category: 'Workspace & Utilities',
        description: 'Fiber internet connection & ergonomics setup',
        amount: 4500,
        date: new Date('2026-10-18'),
      },
      {
        userId: user.id,
        type: TransactionType.LOAN_DISBURSEMENT,
        category: 'Lending',
        description: 'Short-term bridge loan to Rohan Sharma',
        amount: 15000,
        date: new Date('2026-10-01'),
        referenceId: loanLent1.id,
      },
      {
        userId: user.id,
        type: TransactionType.LOAN_REPAYMENT,
        category: 'Debt Recovery',
        description: 'Partial repayment received from Rohan Sharma',
        amount: 5000,
        date: new Date('2026-10-20'),
        referenceId: loanLent1.id,
      },
    ],
  });

  // 9. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: NotificationType.INVOICE_OVERDUE,
        title: 'Invoice Overdue Alert',
        message: 'Invoice INV-2026-005 for Starlight Media Agency (₹23,600) is 5 days overdue.',
        isRead: false,
        link: '/invoices',
      },
      {
        userId: user.id,
        type: NotificationType.LENT_MONEY_RECOVERY,
        title: 'Repayment Due Soon',
        message: 'Rohan Sharma has an upcoming loan repayment balance of ₹10,000 due in 6 days.',
        isRead: false,
        link: '/borrow-lend',
      },
      {
        userId: user.id,
        type: NotificationType.SAVINGS_GOAL_ALERT,
        title: 'Savings Pace Tracking',
        message: 'You need ₹4,250 weekly to hit your ₹25,000 Anthropic IPO readiness target in 4 weeks.',
        isRead: false,
        link: '/investments',
      },
      {
        userId: user.id,
        type: NotificationType.INVESTMENT_UPDATE,
        title: 'Investment Watchlist Reminder',
        message: 'Anthropic IPO Watch status remains UNVERIFIED. Remember to review official filings before allocating capital.',
        isRead: true,
        link: '/investments',
      },
      {
        userId: user.id,
        type: NotificationType.WEEKLY_SUMMARY,
        title: 'Weekly Financial Snapshot',
        message: 'Cash received this month: ₹69,000. Outstanding invoices: ₹99,600. Net receivables: ₹10,000.',
        isRead: true,
        link: '/dashboard',
      },
    ],
  });

  // 10. AI Insights
  await prisma.aIInsight.createMany({
    data: [
      {
        userId: user.id,
        category: 'Cashflow Optimization',
        title: 'Receivables Acceleration',
        summary: 'You have ₹99,600 in outstanding client invoices, with ₹23,600 currently overdue from Starlight Media Agency. Following up now would safeguard your working capital.',
        actionItems: JSON.stringify([
          'Send polite WhatsApp/email reminder for INV-2026-005',
          'Offer PayPal quick-pay link for instant clearing',
          'Check milestone approval for Horizon FinCorp (₹59,000)',
        ]),
      },
      {
        userId: user.id,
        category: 'Savings & IPO Readiness',
        title: 'Anthropic Watch Capital Breakdown',
        summary: 'Target is ₹25,000. You have saved ₹8,000 confirmed cash. The remaining ₹17,000 gap can be comfortably funded by the upcoming Horizon FinCorp payout or Rohan’s ₹10,000 repayment without touching your emergency reserve.',
        actionItems: JSON.stringify([
          'Do not borrow or compromise the ₹38,000 Emergency Reserve',
          'Allocate 35% of the next invoice payment towards this goal',
          'Monitor SEC regulatory calendar for official S-1 announcements',
        ]),
      },
    ],
  });

  console.log('✅ Seed completed successfully! All demo records loaded into PostgreSQL.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
