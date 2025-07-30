
import Link from 'next/link';


export default function QuickActions() {
  return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
              <div className="space-y-4">
                
                {/* Import Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600">
                      Import OFX Files
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Upload bank transactions with smart categorization
                    </p>
                  </div>
                  <span className="text-blue-600">→</span>
                </Link>

                {/* Manage Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600">
                      Manage Transactions
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      View, edit, and categorize your transactions
                    </p>
                  </div>
                  <span className="text-green-600">→</span>
                </Link>

                {/* View Accounts */}
                <Link
                  href="/accounts"
                  className="flex items-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">🏦</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600">
                      Manage Accounts
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      View and organize your bank accounts
                    </p>
                  </div>
                  <span className="text-purple-600">→</span>
                </Link>

                {/* Categories */}
                <Link
                  href="/categories"
                  className="flex items-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📂</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-orange-600">
                      Manage Categories
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Organize and customize expense categories
                    </p>
                  </div>
                  <span className="text-orange-600">→</span>
                </Link>
              </div>
            </div>
  );
}