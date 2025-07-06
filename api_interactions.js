// Financial Planner API - Database Interactions
// This shows how each API endpoint interacts with PostgreSQL tables

const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});

// ==============================================================================
// USER AUTHENTICATION AND PROFILE ROUTES
// ==============================================================================

// POST /api/auth/register - Create new user account
// This is your entry point - creates the foundation user record
app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    // Hash password before storing (using bcrypt in real implementation)
    const passwordHash = await hashPassword(password);
    
    // Single INSERT into users table
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, created_at
    `, [email, passwordHash, firstName, lastName]);
    
    // Note: We return the user data but NOT the password hash
    const user = result.rows[0];
    res.status(201).json({
      message: 'User created successfully',
      user: user
    });
    
  } catch (error) {
    // Handle duplicate email constraint violation
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// GET /api/users/profile - Get current user's profile
// Simple single-table query with user authentication
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    // The authenticateToken middleware extracts user_id from JWT token
    const userId = req.user.id;
    
    // Single SELECT from users table, excluding sensitive data
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, date_of_birth, 
             annual_income, risk_tolerance, financial_goals,
             created_at, last_login
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ==============================================================================
// ACCOUNT MANAGEMENT ROUTES
// ==============================================================================

// POST /api/accounts - Add new bank account
// Creates account record and establishes relationship with user
app.post('/api/accounts', authenticateToken, async (req, res) => {
  const { accountName, accountType, bankName, currentBalance } = req.body;
  const userId = req.user.id;
  
  try {
    // INSERT into accounts table with user relationship
    const result = await pool.query(`
      INSERT INTO accounts (user_id, account_name, account_type, bank_name, current_balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, account_name, account_type, bank_name, current_balance, created_at
    `, [userId, accountName, accountType, bankName, currentBalance]);
    
    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0]
    });
    
  } catch (error) {
    // Handle unique constraint violation (duplicate account name for user)
    if (error.code === '23505') {
      res.status(409).json({ error: 'Account name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
});

// GET /api/accounts - List user's bank accounts
// Multi-table query that joins accounts with transaction summaries
app.get('/api/accounts', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Complex query joining accounts with transaction aggregates
    // This gives us account info plus recent transaction stats
    const result = await pool.query(`
      SELECT 
        a.id, a.account_name, a.account_type, a.bank_name, 
        a.current_balance, a.currency, a.created_at,
        COUNT(t.id) as transaction_count,
        MAX(t.transaction_date) as last_transaction_date,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses
      FROM accounts a
      LEFT JOIN transactions t ON a.id = t.account_id 
        AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      WHERE a.user_id = $1 AND a.is_active = true
      GROUP BY a.id, a.account_name, a.account_type, a.bank_name, 
               a.current_balance, a.currency, a.created_at
      ORDER BY a.created_at DESC
    `, [userId]);
    
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// ==============================================================================
// TRANSACTION UPLOAD AND PROCESSING ROUTES
// ==============================================================================

// POST /api/transactions/upload - Upload and process bank statement
// This is the most complex operation - involves multiple tables and file processing
app.post('/api/transactions/upload', authenticateToken, upload.single('bankStatement'), async (req, res) => {
  const userId = req.user.id;
  const { accountId } = req.body;
  const file = req.file;
  
  // Start a database transaction to ensure data consistency
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Create file_uploads record to track processing
    const fileUploadResult = await client.query(`
      INSERT INTO file_uploads (user_id, account_id, original_filename, file_type, 
                               file_size_bytes, file_hash, processing_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'processing')
      RETURNING id
    `, [userId, accountId, file.originalname, 
        file.originalname.split('.').pop().toLowerCase(),
        file.size, calculateFileHash(file.buffer)]);
    
    const fileUploadId = fileUploadResult.rows[0].id;
    
    // Step 2: Parse the uploaded file (CSV example)
    const transactions = await parseCSVFile(file.path);
    
    // Step 3: Process each transaction
    let importedCount = 0;
    let duplicateCount = 0;
    
    for (const transaction of transactions) {
      try {
        // Check for duplicates using the unique constraint
        const duplicateCheck = await client.query(`
          SELECT id FROM transactions 
          WHERE user_id = $1 AND account_id = $2 AND transaction_date = $3 
            AND amount = $4 AND description = $5
        `, [userId, accountId, transaction.date, transaction.amount, transaction.description]);
        
        if (duplicateCheck.rows.length > 0) {
          duplicateCount++;
          continue;
        }
        
        // Step 4: Attempt automatic categorization
        const categoryId = await autoCategorizTransaction(client, userId, transaction);
        
        // Step 5: Insert the transaction
        await client.query(`
          INSERT INTO transactions (user_id, account_id, file_upload_id, category_id,
                                  transaction_date, description, amount, transaction_type,
                                  confidence_score, needs_review)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [userId, accountId, fileUploadId, categoryId,
            transaction.date, transaction.description, transaction.amount,
            transaction.amount > 0 ? 'income' : 'expense',
            categoryId ? 0.8 : 0.3, // High confidence if categorized, low if not
            !categoryId]); // Needs review if we couldn't categorize
        
        importedCount++;
        
      } catch (transactionError) {
        console.error('Failed to process transaction:', transactionError);
        // Continue processing other transactions
      }
    }
    
    // Step 6: Update file_uploads record with results
    await client.query(`
      UPDATE file_uploads 
      SET processing_status = 'completed', 
          processing_completed_at = CURRENT_TIMESTAMP,
          transactions_imported = $1,
          transactions_duplicates = $2,
          date_range_start = $3,
          date_range_end = $4
      WHERE id = $5
    `, [importedCount, duplicateCount, 
        Math.min(...transactions.map(t => t.date)),
        Math.max(...transactions.map(t => t.date)),
        fileUploadId]);
    
    await client.query('COMMIT');
    
    res.json({
      message: 'File processed successfully',
      importedCount,
      duplicateCount,
      fileUploadId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Update file_uploads record to show failure
    await client.query(`
      UPDATE file_uploads 
      SET processing_status = 'failed', 
          error_message = $1,
          processing_completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [error.message, fileUploadId]);
    
    res.status(500).json({ error: 'Failed to process file' });
  } finally {
    client.release();
  }
});

// Helper function for automatic categorization
async function autoCategorizTransaction(client, userId, transaction) {
  try {
    // Look for categories with matching keywords or merchant patterns
    const result = await client.query(`
      SELECT id, name 
      FROM categories 
      WHERE (user_id = $1 OR user_id IS NULL) 
        AND is_active = true
        AND (
          keywords && ARRAY[LOWER($2)] 
          OR EXISTS (
            SELECT 1 FROM unnest(merchant_patterns) AS pattern 
            WHERE LOWER($2) ~ pattern
          )
        )
      ORDER BY user_id DESC NULLS LAST -- Prefer user categories over system categories
      LIMIT 1
    `, [userId, transaction.description.toLowerCase()]);
    
    return result.rows.length > 0 ? result.rows[0].id : null;
    
  } catch (error) {
    console.error('Auto-categorization failed:', error);
    return null;
  }
}

// ==============================================================================
// TRANSACTION MANAGEMENT ROUTES
// ==============================================================================

// GET /api/transactions - List transactions with filtering
// Complex query with multiple JOINs and filtering options
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { 
    accountId, 
    categoryId, 
    startDate, 
    endDate, 
    minAmount, 
    maxAmount, 
    page = 1, 
    limit = 50,
    sortBy = 'transaction_date',
    sortOrder = 'DESC'
  } = req.query;
  
  try {
    // Build dynamic WHERE clause based on filters
    let whereConditions = ['t.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;
    
    if (accountId) {
      whereConditions.push(`t.account_id = $${paramIndex}`);
      queryParams.push(accountId);
      paramIndex++;
    }
    
    if (categoryId) {
      whereConditions.push(`t.category_id = $${paramIndex}`);
      queryParams.push(categoryId);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`t.transaction_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`t.transaction_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (minAmount) {
      whereConditions.push(`t.amount >= $${paramIndex}`);
      queryParams.push(minAmount);
      paramIndex++;
    }
    
    if (maxAmount) {
      whereConditions.push(`t.amount <= $${paramIndex}`);
      queryParams.push(maxAmount);
      paramIndex++;
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Main query with JOINs to get related data
    const query = `
      SELECT 
        t.id, t.transaction_date, t.description, t.amount, t.transaction_type,
        t.user_notes, t.tags, t.needs_review, t.confidence_score,
        a.account_name, a.account_type,
        c.name as category_name, c.color as category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereConditions.join(' AND ')}
        AND t.is_hidden = false
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${whereConditions.join(' AND ')}
        AND t.is_hidden = false
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].total);
    
    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PUT /api/transactions/:id - Update transaction (categorization, notes, etc.)
// Updates transaction with proper validation and user ownership check
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const transactionId = req.params.id;
  const { categoryId, userDescription, userNotes, tags } = req.body;
  
  try {
    // Verify user owns this transaction and update it
    const result = await pool.query(`
      UPDATE transactions 
      SET category_id = $1, 
          user_description = $2, 
          user_notes = $3, 
          tags = $4,
          needs_review = false,
          confidence_score = 1.0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING id, category_id, user_description, user_notes, tags
    `, [categoryId, userDescription, userNotes, tags, transactionId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or not owned by user' });
    }
    
    res.json({
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// ==============================================================================
// BUDGET MANAGEMENT ROUTES
// ==============================================================================

// POST /api/budgets - Create new budget
// Creates budget with validation against existing budgets
app.post('/api/budgets', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, categoryId, amount, budgetType, startDate, endDate } = req.body;
  
  try {
    // Check for overlapping budgets (same category and overlapping dates)
    const overlapCheck = await pool.query(`
      SELECT id FROM budgets 
      WHERE user_id = $1 AND category_id = $2 AND is_active = true
        AND (
          (start_date <= $3 AND (end_date IS NULL OR end_date >= $3))
          OR (start_date <= $4 AND (end_date IS NULL OR end_date >= $4))
          OR (start_date >= $3 AND start_date <= $4)
        )
    `, [userId, categoryId, startDate, endDate || startDate]);
    
    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Budget already exists for this category and time period' 
      });
    }
    
    // Create the budget
    const result = await pool.query(`
      INSERT INTO budgets (user_id, category_id, name, amount, budget_type, 
                          start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, amount, budget_type, start_date, end_date
    `, [userId, categoryId, name, amount, budgetType, startDate, endDate]);
    
    res.status(201).json({
      message: 'Budget created successfully',
      budget: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// GET /api/budgets - List budgets with spending analysis
// Complex query that joins budgets with actual spending data
app.get('/api/budgets', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { active = true } = req.query;
  
  try {
    // Complex query that calculates budget vs actual spending
    const result = await pool.query(`
      SELECT 
        b.id, b.name, b.amount as budget_amount, b.budget_type,
        b.start_date, b.end_date, b.alert_threshold,
        c.name as category_name, c.color as category_color,
        COALESCE(SUM(ABS(t.amount)), 0) as actual_spending,
        CASE 
          WHEN b.amount > 0 THEN (COALESCE(SUM(ABS(t.amount)), 0) / b.amount) * 100
          ELSE 0 
        END as percentage_used,
        b.amount - COALESCE(SUM(ABS(t.amount)), 0) as remaining_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON b.category_id = t.category_id 
        AND t.user_id = b.user_id
        AND t.transaction_date >= b.start_date
        AND (b.end_date IS NULL OR t.transaction_date <= b.end_date)
        AND t.amount < 0 -- Only count expenses
      WHERE b.user_id = $1 AND b.is_active = $2
      GROUP BY b.id, b.name, b.amount, b.budget_type, b.start_date, b.end_date,
               b.alert_threshold, c.name, c.color
      ORDER BY b.start_date DESC
    `, [userId, active]);
    
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// ==============================================================================
// FINANCIAL ANALYTICS ROUTES
// ==============================================================================

// GET /api/analytics/spending - Get spending analysis by category and time
// This demonstrates complex analytical queries across multiple tables
app.get('/api/analytics/spending', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { 
    startDate, 
    endDate, 
    groupBy = 'category', // 'category', 'month', 'account'
    accountId 
  } = req.query;
  
  try {
    let query, queryParams;
    
    if (groupBy === 'category') {
      // Group spending by category
      query = `
        SELECT 
          c.id as category_id,
          c.name as category_name,
          c.color as category_color,
          COUNT(t.id) as transaction_count,
          SUM(ABS(t.amount)) as total_amount,
          AVG(ABS(t.amount)) as average_amount,
          MAX(ABS(t.amount)) as largest_amount,
          MIN(ABS(t.amount)) as smallest_amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 
          AND t.amount < 0 -- Only expenses
          AND t.transaction_date >= $2 
          AND t.transaction_date <= $3
          ${accountId ? 'AND t.account_id = $4' : ''}
        GROUP BY c.id, c.name, c.color
        ORDER BY total_amount DESC
      `;
      queryParams = accountId ? [userId, startDate, endDate, accountId] : [userId, startDate, endDate];
      
    } else if (groupBy === 'month') {
      // Group spending by month
      query = `
        SELECT 
          DATE_TRUNC('month', t.transaction_date) as month,
          COUNT(t.id) as transaction_count,
          SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income,
          SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses,
          SUM(t.amount) as net_amount
        FROM transactions t
        WHERE t.user_id = $1 
          AND t.transaction_date >= $2 
          AND t.transaction_date <= $3
          ${accountId ? 'AND t.account_id = $4' : ''}
        GROUP BY DATE_TRUNC('month', t.transaction_date)
        ORDER BY month ASC
      `;
      queryParams = accountId ? [userId, startDate, endDate, accountId] : [userId, startDate, endDate];
    }
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      groupBy,
      dateRange: { startDate, endDate },
      data: result.rows
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spending analysis' });
  }
});

// GET /api/analytics/trends - Identify spending trends over time
// Advanced analytical query that calculates period-over-period changes
app.get('/api/analytics/trends', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { period = 'monthly' } = req.query; // 'weekly', 'monthly', 'quarterly'
  
  try {
    // Calculate spending trends with period-over-period comparison
    const query = `
      WITH spending_periods AS (
        SELECT 
          DATE_TRUNC($2, t.transaction_date) as period,
          SUM(ABS(t.amount)) as total_spending,
          COUNT(t.id) as transaction_count
        FROM transactions t
        WHERE t.user_id = $1 
          AND t.amount < 0 -- Only expenses
          AND t.transaction_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY DATE_TRUNC($2, t.transaction_date)
      ),
      spending_with_previous AS (
        SELECT 
          period,
          total_spending,
          transaction_count,
          LAG(total_spending, 1) OVER (ORDER BY period) as previous_spending,
          LAG(transaction_count, 1) OVER (ORDER BY period) as previous_count
        FROM spending_periods
      )
      SELECT 
        period,
        total_spending,
        transaction_count,
        previous_spending,
        CASE 
          WHEN previous_spending > 0 THEN 
            ROUND(((total_spending - previous_spending) / previous_spending * 100)::numeric, 2)
          ELSE NULL 
        END as spending_change_percent,
        CASE 
          WHEN previous_spending > 0 THEN total_spending - previous_spending
          ELSE NULL 
        END as spending_change_amount
      FROM spending_with_previous
      ORDER BY period ASC
    `;
    
    const result = await pool.query(query, [userId, period]);
    
    res.json({
      period,
      trends: result.rows
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spending trends' });
  }
});

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

// File parsing helper (simplified CSV example)
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const transactions = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Parse CSV row into transaction object
        // This would need to be adapted for different bank CSV formats
        transactions.push({
          date: new Date(row.Date),
          description: row.Description,
          amount: parseFloat(row.Amount),
          balance: parseFloat(row.Balance)
        });
      })
      .on('end', () => {
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

