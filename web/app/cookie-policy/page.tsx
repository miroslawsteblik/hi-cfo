import Link from 'next/link';
import { COOKIE_CATEGORIES } from '@/lib/cookie-consent';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Cookie Policy
            </h1>
            <p className="text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </header>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What Are Cookies?
            </h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are stored on your device when you visit our website. 
              They help us provide you with a secure, personalized experience and enable essential 
              functionality like authentication and security.
            </p>
            <p className="text-gray-700">
              As a financial application, we take your privacy seriously and only use cookies that 
              are necessary for security, functionality, and improving your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Types of Cookies We Use
            </h2>
            <div className="space-y-6">
              {Object.entries(COOKIE_CATEGORIES).map(([key, category]) => (
                <div key={key} className="border rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-medium text-gray-900">
                      {category.name}
                    </h3>
                    {category.required && (
                      <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4">
                    {category.description}
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Specific Cookies:
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {category.cookies.map((cookie, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <code className="bg-gray-200 px-1 rounded">{cookie}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Managing Your Cookie Preferences
            </h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                You can manage your cookie preferences at any time. Please note that disabling 
                essential cookies may affect the functionality and security of your account.
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">Browser Settings:</h4>
                  <p className="text-sm text-gray-600">
                    You can configure your browser to refuse cookies or alert you when cookies are being sent.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Our Cookie Banner:</h4>
                  <p className="text-sm text-gray-600">
                    Use our cookie consent banner to customize which types of cookies you allow.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Data Retention
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Essential Cookies:</strong> Stored until you log out or for up to 7 days for security purposes.
              </p>
              <p>
                <strong>Functional Cookies:</strong> Stored for up to 1 year or until you change your preferences.
              </p>
              <p>
                <strong>Analytics Cookies:</strong> Stored for up to 2 years for statistical analysis.
              </p>
              <p>
                <strong>Consent Record:</strong> Your cookie preferences are stored for 1 year.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Third-Party Cookies
            </h2>
            <p className="text-gray-700">
              We may use third-party services that set their own cookies for analytics and functionality. 
              These services have their own privacy policies and cookie practices. We recommend reviewing 
              their policies if you choose to enable these cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="font-medium">Privacy Team</p>
              <p>Email: privacy@hi-cfo.com</p>
              <p>Address: [Your Company Address]</p>
            </div>
          </section>

          <div className="pt-8 border-t">
            <Link 
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-500"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}