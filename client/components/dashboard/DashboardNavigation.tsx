// // components/dashboard/DashboardNavigation.tsx
// import LogoutButton from '@/components/auth/logout-button';

// interface User {
//   id: string;
//   email: string;
//   first_name?: string;
//   last_name?: string;
//   role: string;
// }

// interface DashboardNavigationProps {
//   user: User;
// }

// export default function DashboardNavigation({ user }: DashboardNavigationProps) {
//   return (
//     <nav className="bg-white shadow-sm border-b">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between h-16">
//           <div className="flex items-center">
//             <h1 className="text-xl font-semibold text-gray-900">
//               Hi-CFO Dashboard
//             </h1>
//           </div>
//           <div className="flex items-center space-x-4">
//             <span className="text-sm text-gray-700">
//               Welcome, {user.first_name || user.email}!
//             </span>
//             <LogoutButton />
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// }