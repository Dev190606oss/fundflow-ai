import 'dotenv/config';
import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fundflow_jwt_secret_dev_key_2026_paypal_hack';

interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(category: string, test: string, condition: boolean, details: string) {
  results.push({
    category,
    test,
    passed: condition,
    details,
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${category}] ${test}: ${details}`);
}

async function runAudit() {
  console.log('\n🔒 STARTING COMPREHENSIVE SECURITY VERIFICATION SUITE\n');

  // 1. Setup / Identify Test Accounts
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@fundflow.ai' } });
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@fundflow.ai' } });

  if (!demoUser || !adminUser) {
    throw new Error('Required demo or admin user missing from database.');
  }

  // Create isolated Test User B for IDOR tests
  const salt = await bcrypt.genSalt(10);
  const userB = await prisma.user.upsert({
    where: { email: 'security_audit_user_b@fundflow.ai' },
    update: {},
    create: {
      email: 'security_audit_user_b@fundflow.ai',
      passwordHash: await bcrypt.hash('SecurePassword123!', salt),
      name: 'User B (Victim)',
      role: 'USER',
      currency: 'INR',
    },
  });

  const demoToken = jwt.sign({ userId: demoUser.id }, JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });
  const userBToken = jwt.sign({ userId: userB.id }, JWT_SECRET, { expiresIn: '1h' });

  // -------------------------------------------------------------
  // Test 1: Unauthenticated Endpoint Protection
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    assert(
      'Auth Security',
      'Unauthenticated Request Rejection',
      res.status === 401,
      `GET /api/dashboard/stats returned ${res.status} (Expected 401)`
    );
  } catch (err: any) {
    assert('Auth Security', 'Unauthenticated Request Rejection', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Role-Based Access Control (RBAC) - User vs Admin
  // -------------------------------------------------------------
  try {
    // Normal user accessing admin route
    const userRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert(
      'RBAC',
      'Non-Admin Blocked From Admin Routes',
      userRes.status === 403,
      `Normal user accessing /api/admin/overview returned ${userRes.status} (Expected 403 Forbidden)`
    );

    // Admin user accessing admin route
    const adminRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = await adminRes.json();
    assert(
      'RBAC',
      'Authorized Admin Access to Admin Routes',
      adminRes.status === 200 && adminData.status === 'OPERATIONAL',
      `Admin user accessing /api/admin/overview returned ${adminRes.status} (Status: ${adminData.status})`
    );
  } catch (err: any) {
    assert('RBAC', 'Admin Route Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Role Self-Escalation Prevention
  // -------------------------------------------------------------
  try {
    const escalateRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${demoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });

    // Zod strict schema will either reject with 400 (unrecognized key) or ignore it
    const updatedUser = await prisma.user.findUnique({ where: { id: demoUser.id } });
    assert(
      'RBAC',
      'Privilege Escalation Prevention',
      updatedUser?.role === 'USER' && (escalateRes.status === 400 || escalateRes.status === 200),
      `User role remains '${updatedUser?.role}' after PUT /auth/me with { role: "ADMIN" }`
    );
  } catch (err: any) {
    assert('RBAC', 'Privilege Escalation Prevention', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Password Hash Privacy
  // -------------------------------------------------------------
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@fundflow.ai', password: 'Password123!' }),
    });
    const loginData = await loginRes.json();
    assert(
      'Credential Privacy',
      'Password Hash Never Returned in Auth API',
      loginData.user && !('passwordHash' in loginData.user) && !('password' in loginData.user),
      'Login response sanitized of password and passwordHash'
    );
  } catch (err: any) {
    assert('Credential Privacy', 'Password Hash Privacy', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 5: IDOR & Cross-User Data Isolation
  // -------------------------------------------------------------
  try {
    // 1. Create client & invoice for User B
    const clientB = await prisma.client.create({
      data: {
        userId: userB.id,
        name: 'Private Client of User B',
        email: 'private@clientb.com',
        contractAmount: 50000,
      },
    });

    const invoiceB = await prisma.invoice.create({
      data: {
        userId: userB.id,
        clientId: clientB.id,
        invoiceNumber: `INV-TEST-B-${Date.now().toString().slice(-4)}`,
        dueDate: new Date(Date.now() + 86400000),
        totalAmount: 50000,
        subtotal: 50000,
        paidAmount: 0,
      },
    });

    // User A attempts to view User B's invoice
    const idorReadRes = await fetch(`${API_BASE}/invoices/${invoiceB.id}`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert(
      'IDOR Protection',
      'Cross-User Invoice Access Blocked',
      idorReadRes.status === 404,
      `User A accessing User B's invoice returned ${idorReadRes.status} (Expected 404)`
    );

    // User A attempts to delete User B's invoice
    const idorDeleteRes = await fetch(`${API_BASE}/invoices/${invoiceB.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    assert(
      'IDOR Protection',
      'Cross-User Invoice Deletion Blocked',
      idorDeleteRes.status === 404,
      `User A attempting to delete User B's invoice returned ${idorDeleteRes.status} (Expected 404)`
    );

    // Clean up test records
    await prisma.invoice.deleteMany({ where: { id: invoiceB.id } });
    await prisma.client.deleteMany({ where: { id: clientB.id } });
  } catch (err: any) {
    assert('IDOR Protection', 'IDOR Isolation Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Input Validation with Zod (Malformed Payload Rejection)
  // -------------------------------------------------------------
  try {
    // Malformed registration (invalid email, too short password)
    const malformedReg = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123', name: '' }),
    });
    assert(
      'Input Validation',
      'Malformed Registration Rejection',
      malformedReg.status === 400,
      `Malformed registration returned ${malformedReg.status} Bad Request with validation errors`
    );

    // Negative invoice item unit price
    const invalidInvoice = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${demoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'not-a-uuid',
        dueDate: '2026-11-20',
        items: [{ description: 'Test', quantity: -5, unitPrice: -100 }],
      }),
    });
    assert(
      'Input Validation',
      'Invalid Invoice Payload Rejection',
      invalidInvoice.status === 400,
      `Negative numbers / malformed client UUID rejected with ${invalidInvoice.status} Bad Request`
    );
  } catch (err: any) {
    assert('Input Validation', 'Input Validation Test', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 7: HTTP Security Headers (Helmet)
  // -------------------------------------------------------------
  try {
    const healthRes = await fetch(`${API_BASE}/health`);
    const csp = healthRes.headers.get('content-security-policy');
    const nosniff = healthRes.headers.get('x-content-type-options');
    const frameOptions = healthRes.headers.get('x-frame-options');

    assert(
      'Security Headers',
      'Helmet Security Headers Active',
      Boolean(nosniff === 'nosniff' && frameOptions),
      `Headers detected: X-Content-Type-Options: ${nosniff}, X-Frame-Options: ${frameOptions}`
    );
  } catch (err: any) {
    assert('Security Headers', 'Helmet Verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Financial Overpayment & Idempotency Safeguards
  // -------------------------------------------------------------
  try {
    // Fetch a sample invoice for demo user
    const sampleInv = await prisma.invoice.findFirst({
      where: { userId: demoUser.id, status: 'PENDING' },
    });

    if (sampleInv) {
      const balanceDue = sampleInv.totalAmount - sampleInv.paidAmount;
      // Attempt to pay more than balance due
      const overpayRes = await fetch(`${API_BASE}/invoices/${sampleInv.id}/manual-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${demoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: balanceDue + 50000,
          paymentMethod: 'BANK_TRANSFER',
        }),
      });

      assert(
        'Financial Integrity',
        'Overpayment Prevention Guardrail',
        overpayRes.status === 400,
        `Payment exceeding balance due rejected with status ${overpayRes.status}`
      );
    } else {
      assert('Financial Integrity', 'Overpayment Prevention Guardrail', true, 'Skipped: No pending invoice in test DB');
    }
  } catch (err: any) {
    assert('Financial Integrity', 'Financial Integrity Guardrail', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 9: PayPal Order Tenant Isolation (Cross-User Order Injection Blocked)
  // -------------------------------------------------------------
  try {
    const demoInvoice = await prisma.invoice.findFirst({
      where: { userId: demoUser.id },
    });

    if (demoInvoice) {
      // User B attempts to create a PayPal checkout order for Demo User's invoice
      const crossOrderRes = await fetch(`${API_BASE}/paypal/create-order`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userBToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId: demoInvoice.id }),
      });

      assert(
        'PayPal Security',
        'Cross-User PayPal Order Creation Blocked',
        crossOrderRes.status === 404,
        `User B creating order for User A invoice returned ${crossOrderRes.status} (Expected 404 Not Found)`
      );
    } else {
      assert('PayPal Security', 'Cross-User PayPal Order Creation Blocked', true, 'Skipped: No invoice in test DB');
    }
  } catch (err: any) {
    assert('PayPal Security', 'PayPal Tenant Isolation', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 10: AI Security - Input Schema Validation & Prompt Guard
  // -------------------------------------------------------------
  try {
    // Malformed/empty prompt to AI endpoint
    const aiRes = await fetch(`${API_BASE}/ai/project-brief`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${demoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: ' ' }), // Blank prompt violates min(5) length schema
    });

    assert(
      'AI Security',
      'AI Malformed Prompt Schema Enforcement',
      aiRes.status === 400,
      `Blank/malformed AI prompt rejected with ${aiRes.status} Bad Request`
    );
  } catch (err: any) {
    assert('AI Security', 'AI Schema Validation', false, err.message);
  }

  // -------------------------------------------------------------
  // Clean up User B
  // -------------------------------------------------------------
  await prisma.user.deleteMany({ where: { id: userB.id } });

  console.log('\n======================================================');
  console.log(`🎯 AUDIT SUMMARY: ${results.filter((r) => r.passed).length} / ${results.length} CHECKS PASSED`);
  console.log('======================================================\n');

  if (results.some((r) => !r.passed)) {
    process.exit(1);
  }
}

runAudit()
  .catch((e) => {
    console.error('Audit execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
