// // components/dashboard/DashboardStats.tsx
// interface StatCard {
//   label: string;
//   value: string;
//   color: string;
//   icon?: string;
// }

// interface DashboardStatsProps {
//   stats?: {
//     totalRevenue?: number;
//     totalExpenses?: number;
//     netIncome?: number;
//     activeProjects?: number;
//   };
// }

// export default function DashboardStats({ stats }: DashboardStatsProps) {
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//     }).format(amount);
//   };

//   const statCards: StatCard[] = [
//     {
//       label: 'Total Revenue',
//       value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : '$0',
//       color: 'text-blue-600',
//       icon: '💰',
//     },
//     {
//       label: 'Total Expenses',
//       value: stats?.totalExpenses ? formatCurrency(stats.totalExpenses) : '$0',
//       color: 'text-red-600',
//       icon: '💸',
//     },
//     {
//       label: 'Net Income',
//       value: stats?.netIncome ? formatCurrency(stats.netIncome) : '$0',
//       color: 'text-green-600',
//       icon: '📈',
//     },
//     {
//       label: 'Active Projects',
//       value: stats?.activeProjects?.toString() || '0',
//       color: 'text-purple-600',
//       icon: '📊',
//     },
//   ];

//   return (
//     <div className="mt-8">
//       <h3 className="font-semibold text-gray-900 mb-4">Dashboard Overview:</h3>
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
//         {statCards.map((stat, index) => (
//           <div key={index} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className={`text-2xl font-bold ${stat.color}`}>
//                   {stat.value}
//                 </div>
//                 <div className="text-sm text-gray-600">{stat.label}</div>
//               </div>
//               {stat.icon && (
//                 <div className="text-2xl opacity-50">{stat.icon}</div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }