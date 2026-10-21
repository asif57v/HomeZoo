import React from 'react';
import { Link } from 'react-router-dom';

// Shown under the login / signup forms, like other consumer apps.
const AuthLegalLinks = ({ action = 'continuing' }) => (
  <div className="text-center text-[11px] text-gray-400 mt-6 leading-relaxed">
    <p>
      By {action}, you agree to our{' '}
      <Link to="/login/terms" className="font-bold text-gray-500 underline underline-offset-2">Terms &amp; Conditions</Link>
      {' '}and{' '}
      <Link to="/login/privacy" className="font-bold text-gray-500 underline underline-offset-2">Privacy Policy</Link>
    </p>
    <p className="mt-2">
      Need help?{' '}
      <Link to="/login/support" className="font-bold text-amber-600 underline underline-offset-2">Support</Link>
    </p>
  </div>
);

export default AuthLegalLinks;
