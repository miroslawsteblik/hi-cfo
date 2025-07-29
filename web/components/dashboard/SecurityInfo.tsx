// // components/dashboard/SecurityInfo.tsx
// const securityFeatures = [
//   { icon: '🔒', text: 'httpOnly Cookies (XSS Protection)' },
//   { icon: '🛡️', text: 'CSRF Protection with SameSite' },
//   { icon: '🔐', text: 'Secure flag in production' },
//   { icon: '⏰', text: 'Automatic cookie expiration' },
//   { icon: '🚀', text: 'Server-side authentication validation' },
// ];

// interface SecurityInfoProps {
//   className?: string;
// }

// export default function SecurityInfo({ className = '' }: SecurityInfoProps) {
//   return (
//     <div className={`mt-8 ${className}`}>
//       <h3 className="font-semibold text-gray-900 mb-4">Security Features:</h3>
//       <div className="bg-green-50 p-6 rounded-lg max-w-2xl mx-auto">
//         <ul className="text-left space-y-2 text-sm text-green-800">
//           {securityFeatures.map((feature, index) => (
//             <li key={index} className="flex items-center space-x-2">
//               <span className="text-base">{feature.icon}</span>
//               <span>{feature.text}</span>
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }