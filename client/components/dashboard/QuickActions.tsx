
import Link from 'next/link';

interface QuickAction {
  title: string;
  description: string;
  href?: string;
  bgColor: string;
  textColor: string;
  buttonText: string;
  buttonColor: string;
  comingSoon?: boolean;
}

const actions: QuickAction[] = [
  {
    title: 'Dashboard Analytics',
    description: 'View your financial analytics and reports',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-900',
    buttonText: 'Coming Soon →',
    buttonColor: 'text-blue-600 hover:text-blue-800',
    comingSoon: true,
  },
  {
    title: 'Transactions',
    description: 'Add, edit, and manage your financial transactions',
    href: '/transactions',
    bgColor: 'bg-green-50',
    textColor: 'text-green-900',
    buttonText: 'Manage Transactions →',
    buttonColor: 'text-green-600 hover:text-green-800',
  },
  {
    title: 'Reports',
    description: 'Generate and view financial reports',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-900',
    buttonText: 'Coming Soon →',
    buttonColor: 'text-purple-600 hover:text-purple-800',
    comingSoon: true,
  },
];

export default function QuickActions() {
  return (
    <div className="mt-8">
      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions:</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {actions.map((action, index) => (
          
          <div key={index} className={`${action.bgColor} p-4 rounded-lg`}>
            <h4 className={`font-medium ${action.textColor}`}>
              {action.title}
            </h4>
            <p className={`text-sm ${action.textColor.replace('900', '700')} mt-1`}>
              {action.description}
            </p>
            {action.href && !action.comingSoon ? (
              <Link
                href={action.href}
                className={`mt-2 text-sm ${action.buttonColor} inline-block`}
              >
                {action.buttonText}
              </Link>
            ) : (
              <button className={`mt-2 text-sm ${action.buttonColor}`}>
                {action.buttonText}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}