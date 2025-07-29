// // components/dashboard/UserInfoCard.tsx
// interface User {
//   id: string;
//   email: string;
//   first_name?: string;
//   last_name?: string;
//   role: string;
// }

// interface UserInfoCardProps {
//   user: User;
// }

// export default function UserInfoCard({ user }: UserInfoCardProps) {
//   return (
//     <div className="bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto">
//       <h3 className="font-semibold text-gray-900 mb-2">User Information:</h3>
//       <div className="text-left space-y-2">
//         <p>
//           <span className="font-medium">Email:</span> {user.email}
//         </p>
//         {user.first_name && (
//           <p>
//             <span className="font-medium">First Name:</span> {user.first_name}
//           </p>
//         )}
//         {user.last_name && (
//           <p>
//             <span className="font-medium">Last Name:</span> {user.last_name}
//           </p>
//         )}
//         <p>
//           <span className="font-medium">Role:</span> {user.role}
//         </p>
//         <p>
//           <span className="font-medium">ID:</span> {user.id}
//         </p>
//       </div>
//     </div>
//   );
// }