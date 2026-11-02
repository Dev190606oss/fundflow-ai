export interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  currency: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  projectDetails?: string;
  contractAmount: number;
  startDate?: string;
  deadline?: string;
  projectStatus: string;
  paymentStatus: string;
  createdAt: string;
  totalBilled?: number;
  totalPaid?: number;
  outstanding?: number;
  projects?: Project[];
  invoices?: Invoice[];
}

export interface Project {
  id: string;
  clientId?: string;
  title: string;
  description?: string;
  budget: number;
  deadline?: string;
  status: string;
  deliverables?: string;
  milestones?: string;
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  client: Client;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  items: InvoiceItem[];
  payments?: Payment[];
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'PAYPAL' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';
  transactionId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paidAt?: string;
  createdAt: string;
}

export type LoanType = 'LENT' | 'BORROWED';
export type LoanStatus = 'ACTIVE' | 'FULLY_REPAID' | 'OVERDUE';

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  repaymentDate: string;
  notes?: string;
}

export interface Loan {
  id: string;
  userId: string;
  type: LoanType;
  partyName: string;
  contactInfo?: string;
  principalAmount: number;
  interestRate: number;
  amountRepaid: number;
  remainingAmount: number;
  startDate: string;
  dueDate?: string;
  status: LoanStatus;
  notes?: string;
  repayments?: LoanRepayment[];
  createdAt: string;
}

export type InvestmentCategory = 'IPO' | 'STOCKS' | 'MUTUAL_FUNDS' | 'ETFS' | 'BONDS' | 'OTHER';
export type OpportunityStatus = 'CONFIRMED' | 'ANNOUNCED' | 'RUMOURED' | 'UNVERIFIED' | 'CLOSED';

export interface InvestmentOpportunity {
  id: string;
  companyName: string;
  logoUrl?: string;
  category: InvestmentCategory;
  description?: string;
  expectedAmount: number;
  targetDate?: string;
  priceBand?: string;
  lotSize?: number;
  infoUrl?: string;
  status: OpportunityStatus;
  isVerified: boolean;
  officialSource?: string;
  lastVerifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  contributionDate: string;
  sourceNotes?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category?: string;
  isCompleted: boolean;
  remainingAmount?: number;
  percentage?: number;
  daysRemaining?: number;
  dailyRequired?: number;
  weeklyRequired?: number;
  monthlyRequired?: number;
  contributions?: SavingsContribution[];
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  category: string;
  title: string;
  summary: string;
  actionItems?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalEarnings: number;
  receivedPayments: number;
  pendingClientPayments: number;
  totalMoneyLent: number;
  totalMoneyBorrowed: number;
  monthlyExpenses: number;
  availableSavings: number;
  totalTargetSavings: number;
  investmentSavingsProgress: number;
  clientsCount: number;
}
