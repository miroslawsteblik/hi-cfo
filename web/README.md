# Hi-CFO Frontend

A modern financial dashboard built with Next.js 15, TypeScript, and Tailwind CSS.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

## Features

- 📊 **Financial Analytics**: Comprehensive transaction analysis and reporting
- 🌙 **Dark Mode**: Full theme support with system preference detection
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🔐 **Authentication**: Secure JWT-based authentication system
- 📁 **OFX Import**: Bank transaction file import and parsing
- 🎯 **Real-time Updates**: Live data synchronization
- 🧾 **Transaction Management**: Complete CRUD operations for financial data
- 📈 **Data Visualization**: Interactive charts and graphs
- 🔍 **Advanced Filtering**: Multi-dimensional data filtering and search

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom theme
- **UI Components**: Custom components with [Radix UI](https://www.radix-ui.com/) primitives
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/)
- **State Management**: React Context + Server Actions
- **Database**: PostgreSQL with [Postgres.js](https://github.com/porsager/postgres)
- **Build Tool**: Turbopack (Next.js built-in)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hi-cfo/web
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # React components
│   ├── analytics/         # Analytics-specific components
│   ├── dashboard/         # Dashboard components
│   ├── layout/           # Layout components
│   ├── transactions/     # Transaction components
│   └── ui/               # Reusable UI components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── ...
├── middleware.ts         # Next.js middleware
├── public/              # Static assets
└── styles/              # Global styles
```

### Component Organization

Components are organized by feature and purpose:

- **Feature Components** (`analytics/`, `dashboard/`, `transactions/`): Feature-specific components
- **Layout Components** (`layout/`): Page layout and structure
- **UI Components** (`ui/`): Reusable, generic UI elements
- **Server Components**: Components prefixed with `Server*` for server-side rendering

### Type System

- **Base Types** (`lib/types/common.ts`): Shared interfaces and utilities
- **Feature Types**: Domain-specific types (transactions, accounts, etc.)
- **API Types** (`lib/types/api.ts`): API request/response types
- **Form Types** (`lib/types/forms.ts`): Form validation schemas

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing component patterns
- Use Tailwind CSS for styling (avoid CSS modules)
- Prefer server components over client components when possible
- Use Zod for runtime validation

### Component Patterns

1. **Server Components** for data fetching
2. **Client Components** for interactivity
3. **Compound Components** for complex UI patterns
4. **Custom Hooks** for reusable logic

### File Naming

- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Types: `camelCase.ts`
- Server Actions: `actions/*.ts`

### Import Organization

Use barrel exports from `index.ts` files:

```tsx
// ✅ Good
import { TransactionTable, CategoryForm } from "@/components";

// ❌ Avoid
import TransactionTable from "@/components/transactions/TransactionTable";
import CategoryForm from "@/components/categories/CategoryForm";
```

## Scripts

| Script               | Description                             |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Start development server with Turbopack |
| `npm run build`      | Build for production                    |
| `npm run start`      | Start production server                 |
| `npm run lint`       | Run ESLint                              |
| `npm run lint:fix`   | Fix ESLint issues automatically         |
| `npm run type-check` | Run TypeScript compiler check           |
| `npm run format`     | Format code with Prettier               |
| `npm run clean`      | Clean build artifacts                   |
| `npm run test`       | Run unit tests                          |
| `npm run test:e2e`   | Run end-to-end tests                    |

## Architecture Decisions

### Server Actions vs API Routes

- **Server Actions**: Used for form submissions and data mutations
- **API Routes**: Used for external integrations and webhooks

### State Management

- **Server State**: Server Actions + React Server Components
- **Client State**: React Context for UI state (theme, modals, etc.)
- **Form State**: Controlled components with Zod validation

### Authentication Flow

1. Login form submits to Server Action
2. Server Action validates credentials and creates JWT
3. JWT stored in HTTP-only cookie
4. Middleware validates JWT on protected routes
5. User data fetched in layout components

## Performance Optimizations

- **Server Components**: Maximum use of server-side rendering
- **Dynamic Imports**: Code splitting for large components
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Proper cache headers and SWR for client-side caching

## Security Features

- **CSRF Protection**: Custom CSRF middleware
- **XSS Protection**: Content Security Policy headers
- **Authentication**: JWT with HTTP-only cookies
- **Input Validation**: Zod schemas for all user inputs
- **Rate Limiting**: API endpoint protection

## Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow the development guidelines**
4. **Add tests** for new functionality
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Pull Request Guidelines

- Include a clear description of changes
- Add or update tests as needed
- Ensure all tests pass
- Follow the existing code style
- Update documentation if needed

## Troubleshooting

### Common Issues

1. **Build Errors**: Run `npm run clean` and rebuild
2. **Type Errors**: Run `npm run type-check` to see detailed errors
3. **Import Issues**: Check if barrel exports are up to date
4. **Database Connection**: Verify DATABASE_URL in environment variables

### Development Tips

- Use the browser's React Developer Tools
- Enable TypeScript strict mode in your IDE
- Use the Network tab to debug API calls
- Check the server logs for detailed error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For more information, please refer to the [Next.js documentation](https://nextjs.org/docs) and [TypeScript handbook](https://www.typescriptlang.org/docs/).
