import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between space-y-2 text-sm text-gray-600 dark:text-gray-400 md:flex-row md:space-y-0">
          <div>
            &copy; {currentYear} Emergent Agent System. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a
              href="#"
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;