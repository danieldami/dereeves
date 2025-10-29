// frontend/src/app/terms/page.js

// This page is static and doesn't need interactivity, so it can remain a Server Component.

// Define metadata for the page
export const metadata = {
  title: 'Terms of Service | Your Foundation',
  description: 'Read the official terms and conditions for using Your Foundation website.',
};

const TermsOfService = () => {
  return (
    <div className="pt-24 pb-16 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 border-b-2 border-indigo-600 pb-2">
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: October 20, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700">
            By accessing or using our website, you agree to be bound by these **Terms of Service** and all policies incorporated by reference. If you do not agree to all these terms, do not use this website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            2. Changes to Terms
          </h2>
          <p className="text-gray-700">
            We reserve the right to modify these Terms at any time. We will post the most current version of these Terms on the website. Your continued use of the website after the posting of changes constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            3. User Conduct
          </h2>
          <p className="text-gray-700 mb-4">
            You agree not to use the website for any unlawful purpose or in any way that might harm, abuse, or otherwise interfere with the property or service of DeReeves Foundation. Prohibited activities include:
          </p>
          <ul className="list-disc list-inside text-gray-700 ml-4 space-y-2">
            <li>Harassment or abuse of other users.</li>
            <li>Uploading viruses or malicious code.</li>
            <li>Unauthorized collection of user information.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            4. Intellectual Property
          </h2>
          <p className="text-gray-700">
            All content on the website, including text, graphics, logos, and images, is the property of DeReeves Foundation or its content suppliers and is protected by copyright and intellectual property laws. You may not use this content without explicit written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Disclaimer of Warranties
          </h2>
          <p className="text-gray-700">
            The website and all content is provided on an "as is" basis without warranties of any kind. DeReeves Foundation disclaims all warranties, express or implied, to the fullest extent permitted by law.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;