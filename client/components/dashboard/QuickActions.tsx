
import Link from 'next/link';


export default function QuickActions() {
  return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
              <div className="space-y-4">
                
                {/* Import Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                      Import OFX Files
                    </h4>
                    <p className="text-sm text-gray-600">
                      Upload bank transactions with smart categorization
                    </p>
                  </div>
                  <span className="text-blue-600">→</span>
                </Link>

                {/* Manage Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-green-600">
                      Manage Transactions
                    </h4>
                    <p className="text-sm text-gray-600">
                      View, edit, and categorize your transactions
                    </p>
                  </div>
                  <span className="text-green-600">→</span>
                </Link>

                {/* View Accounts */}
                <Link
                  href="/accounts"
                  className="flex items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">🏦</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-purple-600">
                      Manage Accounts
                    </h4>
                    <p className="text-sm text-gray-600">
                      View and organize your bank accounts
                    </p>
                  </div>
                  <span className="text-purple-600">→</span>
                </Link>

                {/* Categories */}
                <Link
                  href="/categories"
                  className="flex items-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📂</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-orange-600">
                      Manage Categories
                    </h4>
                    <p className="text-sm text-gray-600">
                      Organize and customize expense categories
                    </p>
                  </div>
                  <span className="text-orange-600">→</span>
                </Link>
              </div>
            </div>
  );
}