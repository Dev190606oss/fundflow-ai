import { PrismaClient, InvoiceStatus, LoanType, LoanStatus } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5001/api';

interface TestRecord {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const testResults: TestRecord[] = [];

function logTest(category: string, test: string, passed: boolean, details: string) {
  testResults.push({
    category,
    test,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${category}] ${test} -> ${details}`);
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let body: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

async function runE2E() {
  console.log('================================================================');
  console.log('🚀 FUNDFLOW AI: END-TO-END PRODUCT WORKFLOW TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // CATEGORY 1: HEALTH & SYSTEM RELIABILITY
    // -------------------------------------------------------------
    console.log('--- CATEGORY 1: HEALTH & SYSTEM RELIABILITY ---');
    const healthRes = await apiRequest('/health');
    logTest(
      'System Health',
      'Health endpoint live with database latency & subsystem diagnostics',
      healthRes.status === 200 && healthRes.body?.database?.status === 'connected',
      `HTTP ${healthRes.status}, DB status: ${healthRes.body?.database?.status}, Latency: ${healthRes.body?.database?.latencyMs}ms, Uptime: ${healthRes.body?.uptime}s`
    );

    // -------------------------------------------------------------
    // CATEGORY 2: AUTHENTICATION & USER MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 2: USER LIFECYCLE & AUTHENTICATION ---');
    const timestamp = Date.now();
    const testUserEmail = `e2e_user_${timestamp}@fundflow-ai.org`;
    const attackerEmail = `e2e_attacker_${timestamp}@fundflow-ai.org`;
    const testPassword = 'StrongPassword!2026';

    // 2.1 Registration
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
        name: 'Alex E2E Freelancer',
      }),
    });
    logTest(
      'Authentication',
      'User Registration succeeds with JWT and sanitized user',
      regRes.status === 201 && !!regRes.body?.token && regRes.body?.user?.email === testUserEmail,
      `HTTP ${regRes.status}, Received token: ${!!regRes.body?.token}, User: ${regRes.body?.user?.name}`
    );

    const userToken = regRes.body?.token;
    const authHeaders = { Authorization: `Bearer ${userToken}` };

    // 2.2 Duplicate Registration Rejection
    const dupRegRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
        name: 'Duplicate Attempt',
      }),
    });
    logTest(
      'Authentication',
      'Duplicate registration rejected safely',
      dupRegRes.status === 400,
      `HTTP ${dupRegRes.status}, Message: ${dupRegRes.body?.message || dupRegRes.body?.error}`
    );

    // 2.3 User Login
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
      }),
    });
    logTest(
      'Authentication',
      'Login with valid credentials yields active session',
      loginRes.status === 200 && !!loginRes.body?.token,
      `HTTP ${loginRes.status}, User ID: ${loginRes.body?.user?.id}`
    );

    // 2.4 Profile Retrieval & Update
    const meRes = await apiRequest('/auth/me', { headers: authHeaders });
    logTest(
      'User Profile',
      'Fetch current profile (/api/auth/me)',
      meRes.status === 200 && meRes.body?.user?.email === testUserEmail,
      `HTTP ${meRes.status}, Email matched: ${meRes.body?.user?.email}`
    );

    const updateProfileRes = await apiRequest('/auth/me', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Alex Rivera Studio',
        businessName: 'Rivera Creative Labs LLC',
        currency: 'USD',
      }),
    });
    logTest(
      'User Profile',
      'Update user business profile and default currency',
      updateProfileRes.status === 200 && updateProfileRes.body?.user?.businessName === 'Rivera Creative Labs LLC',
      `HTTP ${updateProfileRes.status}, Business Name: ${updateProfileRes.body?.user?.businessName}, Currency: ${updateProfileRes.body?.user?.currency}`
    );

    // -------------------------------------------------------------
    // CATEGORY 3: CLIENT & PROJECT MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 3: CLIENT & PROJECT LIFECYCLE ---');
    const createClientRes = await apiRequest('/clients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Acme Global Ventures',
        email: 'billing@acme-ventures.io',
        phone: '+1-555-0199',
        company: 'Acme Corp',
        projectDetails: 'Enterprise Design System and Payment Gateway Integration',
        contractAmount: 15000,
      }),
    });
    logTest(
      'Clients',
      'Create new client entity with financial contract values',
      createClientRes.status === 201 && !!createClientRes.body?.id,
      `HTTP ${createClientRes.status}, Client ID: ${createClientRes.body?.id}, Name: ${createClientRes.body?.name}`
    );
    const clientId = createClientRes.body?.id;

    const listClientsRes = await apiRequest('/clients', { headers: authHeaders });
    logTest(
      'Clients',
      'Fetch clients list scoped to authenticated user',
      listClientsRes.status === 200 && Array.isArray(listClientsRes.body) && listClientsRes.body.some((c: any) => c.id === clientId),
      `HTTP ${listClientsRes.status}, Client count: ${listClientsRes.body?.length}`
    );

    // -------------------------------------------------------------
    // CATEGORY 4: INVOICING & FINANCIAL ARITHMETIC PRECISION
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 4: INVOICING & FINANCIAL PRECISION ---');
    const invoicePayload = {
      clientId,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      notes: 'Net-14 consulting services via PayPal or wire.',
      taxRate: 10, // 10%
      discountAmount: 100, // $100 fixed discount
      items: [
        {
          description: 'Fintech UI/UX Architecture Review',
          quantity: 10,
          unitPrice: 125.50, // 10 * 125.50 = 1255.00
        },
        {
          description: 'Express/Prisma Database Optimization',
          quantity: 20,
          unitPrice: 85.25, // 20 * 85.25 = 1705.00
        },
      ],
    };

    // Expected calculations:
    // Subtotal: 1255.00 + 1705.00 = 2960.00
    // Tax (10%): 296.00
    // Discount: 100.00
    // Total Amount: 2960.00 + 296.00 - 100.00 = 3156.00
    // Paid Amount: 0.00
    const createInvRes = await apiRequest('/invoices', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(invoicePayload),
    });

    const inv = createInvRes.body;
    const arithmeticAccurate =
      createInvRes.status === 201 &&
      Number(inv?.subtotal) === 2960.00 &&
      Number(inv?.taxAmount) === 296.00 &&
      Number(inv?.discountAmount) === 100.00 &&
      Number(inv?.totalAmount) === 3156.00 &&
      Number(inv?.paidAmount) === 0.00;

    logTest(
      'Invoicing Precision',
      'Exact decimal calculation (Subtotal, Tax, Discount, Total, Initial Paid)',
      arithmeticAccurate,
      `HTTP ${createInvRes.status}, Number=${inv?.invoiceNumber}, Subtotal=$${inv?.subtotal}, Tax=$${inv?.taxAmount}, Total=$${inv?.totalAmount}, Paid=$${inv?.paidAmount}`
    );
    const invoiceId = inv?.id;

    // -------------------------------------------------------------
    // CATEGORY 5: INVOICE PAYMENT & STATUS TRANSITIONS
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 5: PAYMENT LIFECYCLE & SETTLEMENT ---');
    // 5.1 Partial Payment ($1500.00)
    const partialPayRes = await apiRequest(`/invoices/${invoiceId}/manual-payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 1500.00,
        paymentMethod: 'BANK_TRANSFER',
        reference: 'Wire transfer 50% retainer',
      }),
    });
    const partialInv = partialPayRes.body?.updatedInvoice;
    const partialValid =
      partialPayRes.status === 200 &&
      Number(partialInv?.paidAmount) === 1500.00 &&
      Number(partialInv?.totalAmount - partialInv?.paidAmount) === 1656.00 &&
      partialInv?.status === InvoiceStatus.PARTIALLY_PAID;

    logTest(
      'Payment Lifecycle',
      'Partial payment updates paidAmount, balance due, and status to PARTIALLY_PAID',
      partialValid,
      `HTTP ${partialPayRes.status}, Paid=$${partialInv?.paidAmount}, BalanceDue=$${partialInv ? partialInv.totalAmount - partialInv.paidAmount : 'N/A'}, Status=${partialInv?.status}`
    );

    // 5.2 Final Payment ($1656.00) to clear invoice
    const finalPayRes = await apiRequest(`/invoices/${invoiceId}/manual-payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 1656.00,
        paymentMethod: 'PAYPAL',
        reference: 'Final balance settlement',
      }),
    });
    const finalInv = finalPayRes.body?.updatedInvoice;
    const finalValid =
      finalPayRes.status === 200 &&
      Number(finalInv?.paidAmount) === 3156.00 &&
      Number(finalInv?.totalAmount - finalInv?.paidAmount) === 0.00 &&
      finalInv?.status === InvoiceStatus.PAID;

    logTest(
      'Payment Lifecycle',
      'Final payment marks invoice PAID with $0.00 remaining balance',
      finalValid,
      `HTTP ${finalPayRes.status}, Paid=$${finalInv?.paidAmount}, BalanceDue=$${finalInv ? finalInv.totalAmount - finalInv.paidAmount : 'N/A'}, Status=${finalInv?.status}`
    );

    // -------------------------------------------------------------
    // CATEGORY 6: LOAN & BORROW/LEND LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 6: LOANS & BORROW/LEND WORKFLOW ---');
    // 6.1 Create Lent Record ($500.00)
    const createLoanRes = await apiRequest('/loans', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: LoanType.LENT,
        partyName: 'Jordan Designer Partner',
        contactInfo: 'jordan@designco.com',
        principalAmount: 500.00,
        notes: 'Emergency software subscription advance',
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
    });
    const loanId = createLoanRes.body?.id;
    logTest(
      'Borrow/Lend',
      'Create loan record with principal amount and counterparty',
      createLoanRes.status === 201 && !!loanId && Number(createLoanRes.body?.principalAmount) === 500.00,
      `HTTP ${createLoanRes.status}, Loan ID: ${loanId}, Principal: $${createLoanRes.body?.principalAmount}`
    );

    // 6.2 Partial Repayment ($200.00)
    const partialRepayRes = await apiRequest(`/loans/${loanId}/repayments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 200.00,
        notes: 'First installment repaid',
      }),
    });
    const partialLoan = partialRepayRes.body?.loan;
    logTest(
      'Borrow/Lend',
      'Record partial repayment updates remaining balance to $300.00 (Status: ACTIVE)',
      partialRepayRes.status === 200 && Number(partialLoan?.remainingAmount) === 300.00 && partialLoan?.status === LoanStatus.ACTIVE,
      `HTTP ${partialRepayRes.status}, Remaining: $${partialLoan?.remainingAmount}, Status: ${partialLoan?.status}`
    );

    // 6.3 Final Repayment ($300.00)
    const finalRepayRes = await apiRequest(`/loans/${loanId}/repayments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 300.00,
        notes: 'Full settlement',
      }),
    });
    const finalLoan = finalRepayRes.body?.loan;
    logTest(
      'Borrow/Lend',
      'Record final repayment transitions loan to FULLY_REPAID with $0.00 remaining',
      finalRepayRes.status === 200 && Number(finalLoan?.remainingAmount) === 0.00 && finalLoan?.status === LoanStatus.FULLY_REPAID,
      `HTTP ${finalRepayRes.status}, Remaining: $${finalLoan?.remainingAmount}, Status: ${finalLoan?.status}`
    );

    // -------------------------------------------------------------
    // CATEGORY 7: SAVINGS GOAL & CAPITAL ALLOCATION
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 7: SAVINGS GOALS & INVESTMENTS ---');
    const createGoalRes = await apiRequest('/investments/goals', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Workstation Upgrade M4 Max',
        targetAmount: 3500.00,
        initialDeposit: 500.00,
        targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      }),
    });
    const goalId = createGoalRes.body?.id;
    logTest(
      'Savings & Investments',
      'Create savings goal with target and initial allocation',
      createGoalRes.status === 201 && !!goalId && Number(createGoalRes.body?.currentAmount) === 500.00,
      `HTTP ${createGoalRes.status}, Goal ID: ${goalId}, Current: $${createGoalRes.body?.currentAmount}`
    );

    // Add contribution ($1000.00)
    const contribRes = await apiRequest(`/investments/goals/${goalId}/contributions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 1000.00,
        sourceNotes: 'Invoice payment capital allocation',
      }),
    });
    const updatedGoal = contribRes.body?.goal;
    logTest(
      'Savings & Investments',
      'Add capital contribution to savings goal updates balance to $1500.00',
      contribRes.status === 200 && Number(updatedGoal?.currentAmount) === 1500.00,
      `HTTP ${contribRes.status}, Current Amount: $${updatedGoal?.currentAmount}`
    );

    // -------------------------------------------------------------
    // CATEGORY 8: MULTI-TENANT ISOLATION & IDOR DEFENSE
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 8: MULTI-TENANT ISOLATION & IDOR DEFENSE ---');
    // Register attacker user
    const attackerRegRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: attackerEmail,
        password: testPassword,
        name: 'Hostile PenTester',
      }),
    });
    const attackerToken = attackerRegRes.body?.token;
    const attackerHeaders = { Authorization: `Bearer ${attackerToken}` };

    // Attacker tries to read victim's invoice
    const attackerInvRes = await apiRequest(`/invoices/${invoiceId}`, { headers: attackerHeaders });
    logTest(
      'IDOR Defense',
      'Tenant B forbidden or not found when accessing Tenant A invoice',
      attackerInvRes.status === 404 || attackerInvRes.status === 403,
      `HTTP ${attackerInvRes.status} (Access safely blocked)`
    );

    // Attacker tries to delete victim's client
    const attackerDelClientRes = await apiRequest(`/clients/${clientId}`, {
      method: 'DELETE',
      headers: attackerHeaders,
    });
    logTest(
      'IDOR Defense',
      'Tenant B cannot delete Tenant A client',
      attackerDelClientRes.status === 404 || attackerDelClientRes.status === 403,
      `HTTP ${attackerDelClientRes.status} (Unauthorized mutation safely rejected)`
    );

    // Attacker tries to view victim's loan
    const attackerLoanRes = await apiRequest(`/loans/${loanId}`, { headers: attackerHeaders });
    logTest(
      'IDOR Defense',
      'Tenant B cannot access Tenant A loan record',
      attackerLoanRes.status === 404 || attackerLoanRes.status === 403,
      `HTTP ${attackerLoanRes.status} (Access safely blocked)`
    );

    // Attacker tries to add contribution to victim's savings goal
    const attackerGoalRes = await apiRequest(`/investments/goals/${goalId}/contributions`, {
      method: 'POST',
      headers: attackerHeaders,
      body: JSON.stringify({ amount: 10 }),
    });
    logTest(
      'IDOR Defense',
      'Tenant B cannot modify Tenant A savings goal',
      attackerGoalRes.status === 404 || attackerGoalRes.status === 403,
      `HTTP ${attackerGoalRes.status} (Mutation safely rejected)`
    );

    // -------------------------------------------------------------
    // CATEGORY 9: DATABASE INTEGRITY & CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CATEGORY 9: DATABASE INTEGRITY VERIFICATION ---');
    // Verify indexes exist in PostgreSQL
    const indexCheck: any[] = await prisma.$queryRaw`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE '%_idx'
      ORDER BY tablename, indexname;
    `;
    const hasIndexedTables = indexCheck.length >= 10;
    logTest(
      'Database Engineering',
      'Relational composite & foreign key indexes active in PostgreSQL',
      hasIndexedTables,
      `Verified ${indexCheck.length} custom composite/relational indexes in schema`
    );

    // Clean up test users safely
    await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: regRes.body?.user?.id } } });
    await prisma.payment.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.invoice.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.client.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.loanRepayment.deleteMany({ where: { loan: { userId: regRes.body?.user?.id } } });
    await prisma.loan.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.savingsContribution.deleteMany({ where: { goal: { userId: regRes.body?.user?.id } } });
    await prisma.savingsGoal.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.transaction.deleteMany({ where: { userId: regRes.body?.user?.id } });
    await prisma.user.delete({ where: { id: regRes.body?.user?.id } });
    await prisma.user.delete({ where: { id: attackerRegRes.body?.user?.id } });
    logTest(
      'Test Cleanliness',
      'Automated teardown of ephemeral test entities completed cleanly',
      true,
      'Test users and associated records pruned; zero residual test artifacts'
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 END-TO-END WORKFLOW SUITE SUMMARY');
    console.log('================================================================');
    const passed = testResults.filter((r) => r.status === 'PASS').length;
    const failed = testResults.filter((r) => r.status === 'FAIL').length;
    console.log(`Total Scenarios Executed: ${testResults.length}`);
    console.log(`Passed:                   ${passed}`);
    console.log(`Failed:                   ${failed}`);
    console.log(`Success Rate:             ${((passed / testResults.length) * 100).toFixed(1)}%`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2E();
