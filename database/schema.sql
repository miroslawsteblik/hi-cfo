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
    merchant_patterns TEXT[], -- Regex patterns for merchant matching
    
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
    currency VARCHAR(3) DEFAULT 'USD',
    
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

-- Indexes for optimal query performance
-- User-related queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Account queries
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_user_active ON accounts(user_id, is_active);

-- Transaction queries (most critical for performance)
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Category queries
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_system ON categories(is_system_category);

-- Budget and goal queries
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX idx_financial_goals_status ON financial_goals(status);

-- File upload queries
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_hash ON file_uploads(file_hash);
CREATE INDEX idx_file_uploads_status ON file_uploads(processing_status);

-- Insight queries
CREATE INDEX idx_insights_user_id ON financial_insights(user_id);
CREATE INDEX idx_insights_type ON financial_insights(insight_type);
CREATE INDEX idx_insights_dismissed ON financial_insights(is_dismissed);

-- Recurring transaction queries
CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_due_date ON recurring_transactions(next_due_date);
CREATE INDEX idx_recurring_active ON recurring_transactions(is_active);

-- GIN indexes for array and JSONB columns
CREATE INDEX idx_categories_keywords ON categories USING GIN(keywords);
CREATE INDEX idx_transactions_tags ON transactions USING GIN(tags);
CREATE INDEX idx_insights_data ON financial_insights USING GIN(insight_data);

-- Update triggers to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables that need updated_at maintenance
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default system categories
INSERT INTO categories (name, color, keywords, merchant_patterns, user_id) VALUES
('Housing', '#4A90E2', ARRAY['rent', 'mortgage', 'apartment', 'house', 'property'], ARRAY['real estate', 'apartments'], NULL),
('Groceries', '#7ED321', ARRAY['grocery', 'supermarket', 'food'], ARRAY['walmart', 'kroger', 'safeway', 'aldi', 'trader joe'], NULL),
('Dining Out', '#F5A623', ARRAY['restaurant', 'cafe', 'dining', 'takeout'], ARRAY['mcdonald''s', 'starbucks', 'chipotle'], NULL),
('Transportation', '#D0021B', ARRAY['gas', 'fuel', 'uber', 'lyft', 'taxi'], ARRAY['exxon', 'shell', 'bp', 'chevron'], NULL),
('Utilities', '#9013FE', ARRAY['electric', 'water', 'gas', 'internet', 'cable', 'phone'], ARRAY['at&t', 'verizon', 'comcast', 'xfinity'], NULL),
('Entertainment', '#F8E71C', ARRAY['movie', 'netflix', 'spotify', 'amazon prime', 'theater'], ARRAY['netflix', 'hulu', 'spotify', 'apple'], NULL),
('Shopping', '#50E3C2', ARRAY['amazon', 'clothing', 'electronics', 'target'], ARRAY['amazon', 'ebay', 'target', 'walmart', 'best buy'], NULL),
('Health', '#BD10E0', ARRAY['doctor', 'pharmacy', 'healthcare', 'fitness'], ARRAY['cvs', 'walgreens', 'hospital', 'clinic'], NULL),
('Income', '#4A90E2', ARRAY['salary', 'deposit', 'payment received', 'dividend'], NULL, NULL),
('Miscellaneous', '#9B9B9B', NULL, NULL, NULL);