-- Financial Planner Database Schema
-- This schema supports bank statement uploads, transaction categorization, and financial analytics

-- Core user management table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone_number VARCHAR(20),
    annual_income DECIMAL(12,2),
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    financial_goals TEXT[], -- Array of goal descriptions
    
    -- Account metadata
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Bank accounts - users can have multiple accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Account identification
    account_name VARCHAR(100) NOT NULL, -- User-friendly name like "Chase Checking"
    account_number_masked VARCHAR(20), -- Last 4 digits only for security
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'checking', 'savings', 'credit_card', 'investment', 'loan', 'other'
    )),
    
    -- Bank information
    bank_name VARCHAR(100) NOT NULL,
    routing_number VARCHAR(20), -- Optional, for ACH transfers
    
    -- Account status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    current_balance DECIMAL(12,2), -- Current balance if known
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can't have duplicate account names
    UNIQUE(user_id, account_name)
);


-- Transaction categories - both system-defined and user-defined
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for system categories
    
    -- Category information
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code for UI
    icon VARCHAR(50), -- Icon name for UI
    
    -- Category hierarchy support
    parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_level INTEGER DEFAULT 1, -- 1 = top level, 2 = subcategory, etc.
    
    -- Category type and behavior
    category_type VARCHAR(20) DEFAULT 'expense' CHECK (category_type IN ('income', 'expense', 'transfer')),
    is_system_category BOOLEAN DEFAULT FALSE, -- True for built-in categories
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auto-categorization rules
    keywords TEXT[], -- Keywords for automatic categorization
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate category names per user (including system categories)
    UNIQUE(user_id, name)
);

-- File uploads - track what bank statements have been processed
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- File information
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('pdf', 'csv', 'ofx', 'qif', 'xlsx')),
    file_size_bytes INTEGER NOT NULL,
    file_hash VARCHAR(64) UNIQUE, -- SHA-256 hash to detect duplicates
    storage_path VARCHAR(500), -- Path where file is stored
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed', 'duplicate'
    )),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Processing results
    transactions_imported INTEGER DEFAULT 0,
    transactions_duplicates INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core transactions table - the heart of the financial data
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    file_upload_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,
    fit_id VARCHAR(100), -- Unique identifier from bank statement (e.g. OFX, QIF)
    
    -- Transaction identification
    transaction_date DATE NOT NULL,
    posted_date DATE, -- When transaction actually posted to account
    description TEXT NOT NULL,
    merchant_name VARCHAR(200), -- Cleaned up merchant name
    
    -- Amount and type
    amount DECIMAL(12,2) NOT NULL, -- Positive for income, negative for expenses
    transaction_type VARCHAR(20) DEFAULT 'expense' CHECK (transaction_type IN (
        'income', 'expense', 'transfer', 'fee', 'interest', 'dividend', 'refund'
    )),
    currency VARCHAR(3), -- Currency code 
    
    -- Additional transaction details
    reference_number VARCHAR(100), -- Check number, confirmation number, etc.
    memo TEXT, -- Additional notes from bank or user
    balance_after DECIMAL(12,2), -- Account balance after this transaction
    
    -- Categorization and tagging
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50), -- 'monthly', 'weekly', 'annual', etc.
    tags TEXT[], -- User-defined tags for flexible organization
    
    -- Data quality and processing
    is_duplicate BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(3,2), -- 0-1 score for auto-categorization confidence
    needs_review BOOLEAN DEFAULT FALSE, -- Flag for transactions needing user review
    is_hidden BOOLEAN DEFAULT FALSE, -- Allow users to hide transactions
    
    -- User modifications
    user_description TEXT, -- User can override the bank description
    user_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate transactions from same upload
    UNIQUE(user_id, account_id, transaction_date, amount, description)
);

-- Budgets - users can set spending limits by category
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Budget details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Budget period
    budget_type VARCHAR(20) DEFAULT 'monthly' CHECK (budget_type IN (
        'weekly', 'monthly', 'quarterly', 'annual', 'custom'
    )),
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Budget behavior
    rollover_unused BOOLEAN DEFAULT FALSE, -- Roll unused budget to next period
    alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- Alert when 80% of budget used
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can't have overlapping budgets for same category
    UNIQUE(user_id, category_id, start_date)
);

-- Financial goals - savings targets, debt payoff goals, etc.
CREATE TABLE financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Goal information
    name VARCHAR(100) NOT NULL,
    description TEXT,
    goal_type VARCHAR(30) NOT NULL CHECK (goal_type IN (
        'savings', 'debt_payoff', 'emergency_fund', 'retirement', 
        'investment', 'purchase', 'other'
    )),
    
    -- Goal amounts and timeline
    target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    target_date DATE,
    
    -- Goal status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'paused', 'cancelled'
    )),
    priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
    
    -- Automation settings
    auto_transfer_amount DECIMAL(12,2), -- Automatic contribution amount
    auto_transfer_frequency VARCHAR(20), -- 'weekly', 'monthly', etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Recurring transactions - track predictable income and expenses
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Recurring transaction details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    merchant_name VARCHAR(200),
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'expense' CHECK (transaction_type IN (
        'income', 'expense', 'transfer'
    )),
    
    -- Recurrence pattern
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN (
        'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annual'
    )),
    next_due_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for indefinite
    
    -- Variation tracking
    typical_amount DECIMAL(12,2), -- Expected amount
    amount_variance DECIMAL(12,2), -- Acceptable variance
    
    -- Status and notifications
    is_active BOOLEAN DEFAULT TRUE,
    notify_before_days INTEGER DEFAULT 3,
    last_matched_transaction_id UUID REFERENCES transactions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insights and analytics cache - store computed financial insights
CREATE TABLE financial_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Insight details
    insight_type VARCHAR(50) NOT NULL, -- 'spending_trend', 'budget_alert', 'savings_opportunity'
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    insight_data JSONB, -- Flexible storage for insight-specific data
    
    -- Insight metadata
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    confidence_score DECIMAL(3,2), -- How confident we are in this insight
    date_range_start DATE,
    date_range_end DATE,
    
    -- User interaction
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Insight lifecycle
    valid_until TIMESTAMP WITH TIME ZONE, -- When this insight expires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


