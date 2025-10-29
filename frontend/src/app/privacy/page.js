// frontend/src/app/privacy/page.js

// This page is static and doesn't need interactivity, so it can remain a Server Component.

// Define metadata for the page
export const metadata = {
  title: 'Privacy Policy | Your Foundation',
  description: 'Review the official privacy policy for Your Foundation.',
};

const PrivacyPolicy = () => {
  return (
    <div className="pt-24 pb-16 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 border-b-2 border-indigo-600 pb-2">
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: October 20, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            1. Information We Collect
          </h2>
          <p className="text-gray-700 mb-4">
            We collect information that you voluntarily provide to us when registering, donating, or contacting us. This may include your **name, email address, mailing address, and payment information**.
          </p>
          <p className="text-gray-700">
            We also automatically collect certain information when you visit our website, such as your **IP address, browser type, and usage data**, to help us improve our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-700 mb-4">
            We use the information we collect for various purposes, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 ml-4 space-y-2">
            <li>Processing your donations and providing tax receipts.</li>
            <li>Sending you updates, newsletters, and marketing communications (where consent is given).</li>
            <li>Improving our website and analyzing user trends.</li>
            <li>Complying with legal obligations.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            3. Sharing of Information
          </h2>
          <p className="text-gray-700">
            We do not sell or rent your personal information to third parties. We may share information with trusted third-party service providers who assist us in operating our website or conducting our business, such as payment processors, but only to the extent necessary to perform those services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            4. Your Rights
          </h2>
          <p className="text-gray-700">
            Depending on your location, you may have the right to access, update, or request deletion of your personal information. Please contact us using the information provided below to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-700">
            If you have questions or comments about this Policy, please contact us at: <a href="mailto:dereevesfoundations@gmail.com" className="text-indigo-600 hover:underline">privacy@yourfoundation.org</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;