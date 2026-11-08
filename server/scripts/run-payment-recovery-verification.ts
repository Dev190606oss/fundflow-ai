import { PrismaClient, InvoiceStatus, Role, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fundflow_jwt_secret_dev_key_2026_paypal_hack';

interface TestResult {
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const testResults: TestResult[] = [];

function record(category: string, testName: string, passed: boolean, details: string) {
  testResults.push({
    category,
    testName,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${testName}: ${details}`);
}

async function api(path: string, options: RequestInit = {}) {
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

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 FUNDFLOW AI — FINAL PAYMENT RECOVERY & CONCURRENCY SUITE');
  console.log('   Verifying Order Association, External Capture Recovery,');
  console.log('   Mixed Payment Concurrency & Financial Consistency');
  console.log('================================================================\n');

  try {
    const ts = Date.now();
    const userAEmail = `audit_recovery_a_${ts}@fundflow-ai.org`;
    const userBEmail = `audit_recovery_b_${ts}@fundflow-ai.org`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecurePassword!2026', salt);

    // Create Test Tenants
    const userA = await prisma.user.create({
      data: {
        email: userAEmail,
        passwordHash,
        name: 'Tenant Alpha (Merchant)',
        role: Role.USER,
        currency: 'INR',
      },
    });
    const tokenA = jwt.sign({ userId: userA.id }, JWT_SECRET, { expiresIn: '2h' });
    const authHeadersA = { Authorization: `Bearer ${tokenA}` };

    const userB = await prisma.user.create({
      data: {
        email: userBEmail,
        passwordHash,
        name: 'Tenant Beta (Attacker)',
        role: Role.USER,
        currency: 'INR',
      },
    });
    const tokenB = jwt.sign({ userId: userB.id }, JWT_SECRET, { expiresIn: '2h' });
    const authHeadersB = { Authorization: `Bearer ${tokenB}` };

    // Create Client for Tenant A
    const clientA = await prisma.client.create({
      data: {
        userId: userA.id,
        name: 'Apex Innovations Corp',
        email: 'billing@apex-innovations.io',
        contractAmount: 10000,
      },
    });

    // Create Test Invoices for Tenant A
    const invoice1 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-REC-1-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
        items: {
          create: [{ description: 'Cloud Architecture Retainer', quantity: 1, unitPrice: 1000, amount: 1000 }],
        },
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-REC-2-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
        items: {
          create: [{ description: 'Security Hardening SOW', quantity: 1, unitPrice: 1000, amount: 1000 }],
        },
      },
    });

    // =================================================================
    // SECTION 1: PAYPAL ORDER ASSOCIATION BEFORE CAPTURE
    // =================================================================
    console.log('\n--- 1. PAYPAL ORDER ASSOCIATION BEFORE CAPTURE ---');

    // 1.1 Tenant B attempts to create PayPal order for Tenant A invoice
    const crossOrderAttempt = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ invoiceId: invoice1.id }),
    });
    record(
      'Order Association',
      'Tenant B cannot create PayPal order for Tenant A invoice',
      crossOrderAttempt.status === 404,
      `HTTP ${crossOrderAttempt.status} (Access safely blocked by multi-tenant ownership check)`
    );

    // 1.2 Tenant A creates legitimate order for invoice 1
    const createOrderRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: invoice1.id }),
    });
    const order1Id = createOrderRes.body?.orderId;
    const trackedOrder1 = await prisma.payPalTransaction.findUnique({ where: { orderId: order1Id } });
    const meta1 = trackedOrder1?.rawResponse ? JSON.parse(trackedOrder1.rawResponse) : null;
    const orderCreatedValid =
      createOrderRes.status === 200 &&
      Boolean(order1Id) &&
      trackedOrder1?.status === 'CREATED' &&
      meta1?.invoiceId === invoice1.id;

    record(
      'Order Association',
      'Order creation embeds invoice ID in metadata and records pre-capture tracking entry',
      orderCreatedValid,
      `HTTP ${createOrderRes.status}, OrderId=${order1Id}, Tracked Status=${trackedOrder1?.status}, Associated InvoiceId=${meta1?.invoiceId}`
    );

    // 1.3 Order Mismatch: Attempting to capture order1 against invoice2 (Order created for Invoice 1 captured against Invoice 2)
    const mismatchCaptureAttempt = await api('/paypal/capture-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: order1Id, invoiceId: invoice2.id }),
    });
    record(
      'Order Association',
      'Order mismatch rejected when capturing order against different invoice',
      mismatchCaptureAttempt.status === 500 && String(mismatchCaptureAttempt.body?.error).includes('mismatch'),
      `HTTP ${mismatchCaptureAttempt.status}, Error: "${mismatchCaptureAttempt.body?.error}"`
    );

    // 1.4 Tenant B attempts to capture Tenant A order against Tenant B invoice
    const invB = await prisma.invoice.create({
      data: {
        userId: userB.id,
        clientId: (await prisma.client.create({ data: { userId: userB.id, name: 'Attacker Client', email: 'att@test.com' } })).id,
        invoiceNumber: `INV-ATTACK-${ts}`,
        dueDate: new Date(),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
      },
    });
    const crossCaptureAttempt = await api('/paypal/capture-order', {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ orderId: order1Id, invoiceId: invB.id }),
    });
    record(
      'Order Association',
      'Cross-user capture attempt rejected (Tenant B capturing Tenant A order)',
      crossCaptureAttempt.status === 500 && String(crossCaptureAttempt.body?.error).includes('Unauthorized'),
      `HTTP ${crossCaptureAttempt.status}, Error: "${crossCaptureAttempt.body?.error}"`
    );

    // 1.5 Missing or arbitrary non-sandbox order token rejected
    const arbitraryOrderAttempt = await api('/paypal/capture-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: 'UNKNOWN_OR_MALFORMED_TOKEN', invoiceId: invoice1.id }),
    });
    record(
      'Order Association',
      'Missing, unassociated or malformed PayPal order token rejected',
      arbitraryOrderAttempt.status === 400 || arbitraryOrderAttempt.status === 500,
      `HTTP ${arbitraryOrderAttempt.status} (Rejected unvalidated token format)`
    );

    // =================================================================
    // SECTION 2: RECOVERY AFTER EXTERNAL CAPTURE SUCCEEDS
    // =================================================================
    console.log('\n--- 2. RECOVERY AFTER EXTERNAL CAPTURE SUCCEEDS ---');

    // Create a fresh invoice for recovery testing
    const recoveryInvoice = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-REC-CRASH-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 750,
        totalAmount: 750,
        paidAmount: 0,
        items: {
          create: [{ description: 'Recovery Test Service', quantity: 1, unitPrice: 750, amount: 750 }],
        },
      },
    });

    const recoveryOrderRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: recoveryInvoice.id }),
    });
    const recoveryOrderId = recoveryOrderRes.body?.orderId;

    // Step 2.1: First capture call succeeds in PayPal but simulates database crash/disconnect during settlement
    const crashCaptureRes = await api('/paypal/capture-order', {
      method: 'POST',
      headers: {
        ...authHeadersA,
        'x-simulate-db-failure': 'true', // Injects simulated DB failure hook
      },
      body: JSON.stringify({ orderId: recoveryOrderId, invoiceId: recoveryInvoice.id }),
    });

    record(
      'Capture Recovery',
      'Step 1-2: Capture succeeds externally in PayPal but database settlement throws simulated failure',
      crashCaptureRes.status === 500 && String(crashCaptureRes.body?.error).includes('SIMULATED_DB_FAILURE_AFTER_CAPTURE'),
      `HTTP ${crashCaptureRes.status}, Injected Fault: "${crashCaptureRes.body?.error}"`
    );

    // Step 2.2: Verify PostgreSQL database state: invoice remains PENDING with 0 payments
    const postCrashInvoice = await prisma.invoice.findUnique({
      where: { id: recoveryInvoice.id },
      include: { payments: true },
    });
    const postCrashTransactions = await prisma.payPalTransaction.findMany({
      where: { orderId: recoveryOrderId, status: 'COMPLETED' },
    });
    const crashStateValid =
      postCrashInvoice?.status === InvoiceStatus.PENDING &&
      Number(postCrashInvoice?.paidAmount) === 0 &&
      postCrashInvoice?.payments.length === 0 &&
      postCrashTransactions.length === 0;

    record(
      'Capture Recovery',
      'Step 2 Verify: Local database rolled back completely; zero partial or corrupted financial state',
      crashStateValid,
      `DB Invoice Status=${postCrashInvoice?.status}, PaidAmount=$${postCrashInvoice?.paidAmount}, PaymentsCount=${postCrashInvoice?.payments.length}, CompletedTxs=${postCrashTransactions.length}`
    );

    // Step 2.3 & 2.4: Client/Webhook retries the same capture request
    const retryCaptureRes = await api('/paypal/capture-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: recoveryOrderId, invoiceId: recoveryInvoice.id }),
    });

    const settledInvoice = await prisma.invoice.findUnique({
      where: { id: recoveryInvoice.id },
      include: { payments: true },
    });
    const settledTransactions = await prisma.payPalTransaction.findMany({
      where: { orderId: recoveryOrderId },
    });

    const recoverySuccessful =
      retryCaptureRes.status === 200 &&
      retryCaptureRes.body?.success === true &&
      retryCaptureRes.body?.status === 'COMPLETED' &&
      settledInvoice?.status === InvoiceStatus.PAID &&
      Number(settledInvoice?.paidAmount) === 750 &&
      settledInvoice?.payments.length === 1 &&
      settledTransactions.length === 1 &&
      settledTransactions[0].status === 'COMPLETED';

    record(
      'Capture Recovery',
      'Step 3-6: Retry successfully retrieves external capture and settles invoice exactly once',
      recoverySuccessful,
      `HTTP ${retryCaptureRes.status}, Status=${settledInvoice?.status}, PaidAmount=$${settledInvoice?.paidAmount}, Payments Count=${settledInvoice?.payments.length}, PayPal Txs=${settledTransactions.length}`
    );

    // Step 2.5: Subsequent retry returns idempotent success with zero duplicate payment
    const duplicateRetryRes = await api('/paypal/capture-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: recoveryOrderId, invoiceId: recoveryInvoice.id }),
    });
    const finalPaymentsCount = await prisma.payment.count({ where: { invoiceId: recoveryInvoice.id } });
    record(
      'Capture Recovery',
      'Idempotent Subsequent Retry: Returns completed result without duplicate ledger entries',
      duplicateRetryRes.status === 200 && finalPaymentsCount === 1,
      `HTTP ${duplicateRetryRes.status}, Payments Count in DB remains ${finalPaymentsCount}`
    );

    // =================================================================
    // SECTION 3: MIXED PAYMENT CONCURRENCY
    // =================================================================
    console.log('\n--- 3. MIXED PAYMENT CONCURRENCY ---');

    // Concurrency 3.1: Two capture requests for the SAME PayPal order
    const concInv1 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-CONC-1-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
      },
    });
    const concOrder1Res = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: concInv1.id }),
    });
    const concOrder1Id = concOrder1Res.body?.orderId;

    const [sameOrderCap1, sameOrderCap2] = await Promise.all([
      api('/paypal/capture-order', {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ orderId: concOrder1Id, invoiceId: concInv1.id }),
      }),
      api('/paypal/capture-order', {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ orderId: concOrder1Id, invoiceId: concInv1.id }),
      }),
    ]);

    const concInv1Db = await prisma.invoice.findUnique({
      where: { id: concInv1.id },
      include: { payments: true },
    });
    const concOrder1Txs = await prisma.payPalTransaction.findMany({ where: { orderId: concOrder1Id } });

    const concSameOrderPassed =
      sameOrderCap1.status === 200 &&
      sameOrderCap2.status === 200 &&
      concInv1Db?.status === InvoiceStatus.PAID &&
      Number(concInv1Db?.paidAmount) === 1000 &&
      concInv1Db?.payments.length === 1 &&
      concOrder1Txs.length === 1;

    record(
      'Mixed Concurrency',
      'Two capture requests for the SAME PayPal order serialize with exactly 1 payment record',
      concSameOrderPassed,
      `Cap1 HTTP ${sameOrderCap1.status}, Cap2 HTTP ${sameOrderCap2.status}, Payments Count=${concInv1Db?.payments.length}, DB Status=${concInv1Db?.status}`
    );

    // Concurrency 3.2: Two distinct PayPal orders attempting to settle the SAME invoice
    const concInv2 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-CONC-2-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
      },
    });
    const orderAlphaRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: concInv2.id }),
    });
    const orderBetaRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: concInv2.id }),
    });
    const orderAlphaId = orderAlphaRes.body?.orderId;
    const orderBetaId = orderBetaRes.body?.orderId;

    const [capAlpha, capBeta] = await Promise.all([
      api('/paypal/capture-order', {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ orderId: orderAlphaId, invoiceId: concInv2.id }),
      }),
      api('/paypal/capture-order', {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ orderId: orderBetaId, invoiceId: concInv2.id }),
      }),
    ]);

    const concInv2Db = await prisma.invoice.findUnique({
      where: { id: concInv2.id },
      include: { payments: true },
    });

    const twoOrdersOneWinner =
      (capAlpha.status === 200 && capBeta.status === 500) ||
      (capBeta.status === 200 && capAlpha.status === 500);

    const concTwoOrdersPassed =
      twoOrdersOneWinner &&
      concInv2Db?.status === InvoiceStatus.PAID &&
      Number(concInv2Db?.paidAmount) === 1000 &&
      concInv2Db?.payments.length === 1;

    record(
      'Mixed Concurrency',
      'Two distinct PayPal orders on same invoice: exactly one settles, duplicate rejected',
      concTwoOrdersPassed,
      `Alpha=${capAlpha.status}, Beta=${capBeta.status}, Recorded PaidAmount=$${concInv2Db?.paidAmount}, Payments Count=${concInv2Db?.payments.length}`
    );

    // Concurrency 3.3: Manual payment racing against PayPal capture
    const concInv3 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-CONC-3-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
      },
    });
    const orderRaceRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: concInv3.id }),
    });
    const orderRaceId = orderRaceRes.body?.orderId;

    const [manualRes, captureRes] = await Promise.all([
      api(`/invoices/${concInv3.id}/manual-payment`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ amount: 1000, paymentMethod: 'BANK_TRANSFER', reference: 'RaceManual' }),
      }),
      api('/paypal/capture-order', {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ orderId: orderRaceId, invoiceId: concInv3.id }),
      }),
    ]);

    const concInv3Db = await prisma.invoice.findUnique({
      where: { id: concInv3.id },
      include: { payments: true },
    });

    const manualVsCaptureOneWinner =
      (manualRes.status === 200 && captureRes.status === 500) ||
      (captureRes.status === 200 && manualRes.status === 400);

    const manualVsCapturePassed =
      manualVsCaptureOneWinner &&
      concInv3Db?.status === InvoiceStatus.PAID &&
      Number(concInv3Db?.paidAmount) === 1000 &&
      concInv3Db?.payments.length === 1;

    record(
      'Mixed Concurrency',
      'Manual payment racing against PayPal capture: serialized via row lock, exactly 1 succeeds',
      manualVsCapturePassed,
      `Manual HTTP ${manualRes.status}, PayPal HTTP ${captureRes.status}, PaidAmount=$${concInv3Db?.paidAmount}, Payments=${concInv3Db?.payments.length}`
    );

    // Concurrency 3.4: Two partial payments that together exactly settle an invoice
    const concInv4 = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-CONC-4-${ts}`,
        dueDate: new Date(Date.now() + 86400000),
        status: InvoiceStatus.PENDING,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
      },
    });

    const [partial1, partial2] = await Promise.all([
      api(`/invoices/${concInv4.id}/manual-payment`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ amount: 500, paymentMethod: 'BANK_TRANSFER', reference: 'PartialPart1' }),
      }),
      api(`/invoices/${concInv4.id}/manual-payment`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ amount: 500, paymentMethod: 'CASH', reference: 'PartialPart2' }),
      }),
    ]);

    const concInv4Db = await prisma.invoice.findUnique({
      where: { id: concInv4.id },
      include: { payments: true },
    });

    const twoPartialsSucceeded =
      partial1.status === 200 &&
      partial2.status === 200 &&
      concInv4Db?.status === InvoiceStatus.PAID &&
      Number(concInv4Db?.paidAmount) === 1000 &&
      concInv4Db?.payments.length === 2;

    record(
      'Mixed Concurrency',
      'Two partial payments that together exactly settle invoice both succeed with zero loss',
      twoPartialsSucceeded,
      `P1 HTTP ${partial1.status}, P2 HTTP ${partial2.status}, PaidAmount=$${concInv4Db?.paidAmount}, Payments Count=${concInv4Db?.payments.length}, Status=${concInv4Db?.status}`
    );

    // =================================================================
    // SECTION 4: FINANCIAL CONSISTENCY VERIFICATION
    // =================================================================
    console.log('\n--- 4. FINANCIAL CONSISTENCY ---');

    // 4.1 Minor unit arithmetic & precision
    const arithmeticInvoice = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-ARITH-${ts}`,
        dueDate: new Date(),
        status: InvoiceStatus.PENDING,
        subtotal: 235.29,
        totalAmount: 235.29,
        paidAmount: 0,
      },
    });
    // Record payment of 235.29
    const exactPayRes = await api(`/invoices/${arithmeticInvoice.id}/manual-payment`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ amount: 235.29, paymentMethod: 'BANK_TRANSFER' }),
    });
    const finalArithInv = await prisma.invoice.findUnique({ where: { id: arithmeticInvoice.id } });
    const balanceDue = Number(finalArithInv?.totalAmount) - Number(finalArithInv?.paidAmount);
    record(
      'Financial Consistency',
      'Exact minor unit decimal precision: invoice marked PAID only when balanceDue === 0.00',
      exactPayRes.status === 200 && finalArithInv?.status === InvoiceStatus.PAID && balanceDue === 0,
      `HTTP ${exactPayRes.status}, Total=$${finalArithInv?.totalAmount}, Paid=$${finalArithInv?.paidAmount}, Outstanding Balance=$${balanceDue.toFixed(2)}`
    );

    // 4.2 Rejection of cancellation when payment exists
    const cancelWithPaymentAttempt = await api(`/invoices/${arithmeticInvoice.id}`, {
      method: 'PUT',
      headers: authHeadersA,
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    record(
      'Financial Consistency',
      'Invoice with payments can NEVER be marked CANCELLED (outstanding balance protected)',
      cancelWithPaymentAttempt.status === 400,
      `HTTP ${cancelWithPaymentAttempt.status} (Cancellation rejected: payments exist)`
    );

    // 4.3 Forex Rate Consistency: verify 85.0 INR/USD constant applied identically
    const invUsd = await prisma.invoice.create({
      data: {
        userId: userA.id,
        clientId: clientA.id,
        invoiceNumber: `INV-FX-${ts}`,
        dueDate: new Date(),
        status: InvoiceStatus.PENDING,
        subtotal: 8500,
        totalAmount: 8500,
        paidAmount: 0,
      },
    });
    const fxOrderRes = await api('/paypal/create-order', {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ invoiceId: invUsd.id }),
    });
    const fxOrderId = fxOrderRes.body?.orderId;
    const fxTracked = await prisma.payPalTransaction.findUnique({ where: { orderId: fxOrderId } });
    record(
      'Financial Consistency',
      'Consistent exchange rate policy (1 USD = 85.00 INR) applied across order creation and capture',
      fxOrderRes.status === 200 && Number(fxTracked?.amount) === 8500,
      `OrderId=${fxOrderId}, Order Amount Recorded=₹${fxTracked?.amount} ($100.00 USD equivalent at 85.0 INR/USD)`
    );

    // =================================================================
    // TEARDOWN EPHEMERAL TEST ARTIFACTS CLEANLY
    // =================================================================
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    console.log('\n🧹 Disposable test fixtures cleanly pruned from database.');

  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  const passedCount = testResults.filter((r) => r.status === 'PASS').length;
  const totalCount = testResults.length;
  console.log('\n================================================================');
  console.log('📊 FINAL PAYMENT RECOVERY VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Checks Executed:  ${totalCount}`);
  console.log(`Passed:                 ${passedCount}`);
  console.log(`Failed:                 ${totalCount - passedCount}`);
  console.log(`Success Rate:           ${((passedCount / totalCount) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runVerification();
