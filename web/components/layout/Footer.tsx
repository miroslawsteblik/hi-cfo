import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Hi-CFO. All rights reserved.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm">
            <Link 
              href="/privacy-policy" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/cookie-policy" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cookie Policy
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Hi-CFO is committed to protecting your financial data with enterprise-grade security and privacy controls.
          </p>
        </div>
      </div>
    </footer>
  );
}