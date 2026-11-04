import React from "react";

const HelpSupport = () => {
  const emailAddress = "mengistuabawa21@gmail.com";

  // Function to track when someone clicks the email link
  const handleEmailClick = async () => {
    console.log("Email link clicked. Recording interaction...");
    try {
      // Replace this URL with your actual Node.js backend endpoint
      await fetch('http://localhost:3000/auth/logs/contact-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SUPPORT_EMAIL_INQUIRY',
          timestamp: new Date().toISOString(),
          user_action: 'Clicked Email Link'
        })
      });
    } catch (error) {
      console.error("Optional: Logging interaction failed", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Help & Support</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Get help with Employee Management System or contact support.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Quick Links */}
        <div className="card p-8 border rounded-xl shadow-sm bg-white dark:bg-gray-800">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Links</h3>
          <ul className="space-y-3 text-lg">
            <li>
              <a href="#user-guide" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                👉 User Guide
              </a>
            </li>
            <li>
              <a href="#faq" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                ❓ FAQ
              </a>
            </li>
            <li>
              <a href="#troubleshooting" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                🔧 Troubleshooting
              </a>
            </li>
            <li>
              <a href="#videos" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                📺 Video Tutorials
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="card p-8 border rounded-xl shadow-sm bg-white dark:bg-gray-800">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contact Support</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                📧
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Email</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  <a 
                    href={`mailto:${emailAddress}?subject=EMS Support Request`} 
                    onClick={handleEmailClick}
                    className="hover:text-blue-500 underline decoration-dotted"
                  >
                    {emailAddress}
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                💬
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Live Chat</h4>
                <p className="text-gray-600 dark:text-gray-300">Available 24/7</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                📞
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Phone</h4>
                <p className="text-gray-600 dark:text-gray-300">+251 921 99 54 99</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Guide Section */}
      <div id="user-guide" className="card p-8 border rounded-xl bg-white dark:bg-gray-800">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📖 User Guide</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-lg mb-3">Admin Features</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Manage Employees (Add/Edit/Delete)</li>
              <li>• Department Management</li>
              <li>• Leave Approvals</li>
              <li>• Category Management</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3">Employee Features</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• View Attendance</li>
              <li>• Apply for Leaves</li>
              <li>• Payroll Details</li>
              <li>• Profile Settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="card p-8 border rounded-xl bg-white dark:bg-gray-800">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">❓ Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">How do I add a new employee?</h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Go to Dashboard → Manage Employees → Add Employee button.</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">How to approve leaves?</h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Navigate to Leaves section and use Approve/Reject buttons.</p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Section */}
      <div id="troubleshooting" className="card p-8 border rounded-xl bg-white dark:bg-gray-800">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔧 Common Issues & Solutions</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">⚠️</div>
            <h4 className="font-semibold mb-2">Login Issues</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Clear browser cookies and try again.</p>
          </div>
          <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🔄</div>
            <h4 className="font-semibold mb-2">Page not loading</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Check server status at port 3000 or 5000.</p>
          </div>
          <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">📱</div>
            <h4 className="font-semibold mb-2">Mobile issues</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Use desktop for admin tasks.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;