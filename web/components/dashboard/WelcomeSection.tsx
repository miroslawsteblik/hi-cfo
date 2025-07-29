
import Link from "next/link";



interface WelcomeSectionProps {
  title: string;
  subtitle: string;
  categorizationRate: number;
  userDisplayName?: any;
}

export default function WelcomeSection({ 
  title,
  subtitle,
  categorizationRate,
  userDisplayName
}: WelcomeSectionProps) {
  return (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg text-white p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {title}, {userDisplayName}! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  {subtitle}
                  {categorizationRate >= 80 && " Great job on keeping your transactions organized!"}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <Link
                  href="/transactions"
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  View Transactions
                </Link>
                <Link
                  href="/transactions"
                  className="bg-blue-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-900 transition-colors"
                >
                  Import OFX
                </Link>
              </div>
            </div>
          </div>
  );
}