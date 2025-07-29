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
--CREATE INDEX IF NOT EXISTS idx_categories_merchant_patterns ON categories USING GIN (merchant_patterns);
CREATE INDEX IF NOT EXISTS idx_categories_user_active ON categories (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_system_active ON categories (is_system_category, is_active);

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

CREATE UNIQUE INDEX idx_transactions_user_fit_id_active ON transactions (user_id, fit_id) 
WHERE deleted_at IS NULL;

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

DELETE FROM categories; -- Clear existing categories
-- UK Grocery Stores
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Groceries', 'Grocery stores and supermarkets', 'expense', true, true, 
 ARRAY['grocery', 'groceries', 'supermarket', 'food', 'shop', 'store','asda', 'asda superstore', 'asda stores', 'tesco', 'tesco stores', 'lidl', 'lidl gb', 'sainsbury', 'morrisons', 'waitrose', 'aldi', 'iceland', 'co-op', 'marks spencer', 'londis', 'convenience'], 
 NOW(), NOW());

-- Utilities (for Thames Water, etc.)
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords, created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Utilities', 'Water, gas, electricity bills', 'expense', true, true, 
 ARRAY['utility', 'utilities', 'water', 'gas', 'electric', 'electricity', 'power','thames water','tv licence', 'british gas', 'edf', 'eon', 'scottish power', 'npower', 'bulb', 'octopus', 'octopus energy'], 
 NOW(), NOW());

-- Internet & Media (for Virgin Media, etc.)
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Internet & TV', 'Internet, TV, and media services', 'expense', true, true, 
 ARRAY['internet', 'broadband', 'tv', 'media', 'cable', 'wifi','virgin media', 'bt', 'sky', 'talk talk', 'plusnet', 'ee', 'tv licence', 'bbc'], 
 NOW(), NOW());

-- Transportation (for Zipcar, etc.)
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords, created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Transportation', 'Car sharing, transport, travel', 'expense', true, true, 
 ARRAY['transport', 'car', 'travel', 'sharing', 'rental', 'zipcar','zipcar', 'enterprise', 'hertz', 'avis', 'uber', 'lyft', 'tfl', 'oyster'], 
 NOW(), NOW());

INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
 (gen_random_uuid(), NULL, 'Gas & Fuel', 'Gasoline and fuel expenses', 'expense', true, true, 
 ARRAY['gas', 'fuel', 'gasoline', 'station', 'petrol','shell', 'exxon', 'chevron', 'bp', 'mobil', 'texaco', 'sunoco', 'marathon', 'arco', 'citgo', 'valero', 'speedway', 'wawa', 'sheetz'], 
 NOW(), NOW());

-- Childcare & Family
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Childcare', 'Childcare and family expenses', 'expense', true, true, 
 ARRAY['childcare', 'child', 'family', 'kids', 'nursery', 'school','childcare.tax.serv', 'childcare tax', 'nursery', 'school'], 
 NOW(), NOW());

-- Financial Services
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Financial Services', 'Banking, insurance, loans', 'expense', true, true, 
 ARRAY['bank', 'insurance', 'loan', 'credit', 'financial', 'mbna', 'prudential','mbna', 'prudential', 'aj bell', 'barclays', 'lloyds', 'halifax', 'natwest', 'hsbc'], 
 NOW(), NOW());

-- Housing & Rent
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Housing', 'Rent, mortgage, housing costs', 'expense', true, true, 
 ARRAY['rent', 'housing', 'mortgage', 'property', 'home', 'rent', 'housing', 'mortgage', 'property'], 
 NOW(), NOW());

-- Council Tax & Government
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords, created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Government & Council', 'Council tax, government services', 'expense', true, true, 
 ARRAY['council', 'tax', 'government', 'local', 'authority','council', 'hmrc', 'dvla', 'passport'], 
 NOW(), NOW());

-- Charity & Donations
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Charity', 'Charitable donations and giving', 'expense', true, true, 
 ARRAY['charity', 'donation', 'giving', 'foundation', 'fundraising', 'virgin foundation', 'justgiving', 'unicef', 'guide dogs', 'oxfam', 'cancer research', 'british heart'], 
 NOW(), NOW());

-- Cash & ATM
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Cash & ATM', 'ATM withdrawals and cash transactions', 'expense', true, true, 
 ARRAY['cash', 'atm', 'withdrawal', 'notemachine', 'cardtronics','notemachine', 'cardtronics', 'atm', 'cash machine', 'link'], 
 NOW(), NOW());



-- Entertainment category
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Entertainment', 'Streaming, movies, entertainment', 'expense', true, true, 
 ARRAY['entertainment', 'streaming', 'movie', 'music', 'netflix', 'prime'], 
 NOW(), NOW());


-- Add interest charges category
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Interest & Fees', 'Bank interest charges and fees', 'expense', true, true, 
ARRAY['interest', 'fee', 'charge', 'penalty','interest charged', 'interest charg', 'bank fee', 'overdraft'], 
NOW(), NOW());


-- Add Travel category
INSERT INTO categories (id, user_id, name, description, category_type, is_system_category, is_active, keywords,  created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Travel', 'Travel and vacation expenses', 'expense', true, true, 
ARRAY['travel', 'vacation', 'holiday', 'trip', 'kreta', 'cosco','kreta', 'cosco', 'travel', 'vacation'], 
NOW(), NOW());