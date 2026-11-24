import toast from 'react-hot-toast';

// Guest mode: the website is browsable without login. Any action that needs an
// account (post property, send enquiry, book, save, like, comment, review...)
// calls requireLogin() first, which sends the guest to /login and brings them
// back to the same page after login.

export const LOGIN_REDIRECT_KEY = 'hz_login_redirect';

export const isLoggedIn = () => !!localStorage.getItem('token');

const currentPath = () => `${window.location.pathname}${window.location.search}`;

// Send the user to /login, remembering where to return. `from` defaults to the current page.
export const goToLogin = (navigate, message, from) => {
  const dest = from || currentPath();
  try { sessionStorage.setItem(LOGIN_REDIRECT_KEY, dest); } catch { /* storage blocked */ }
  if (message) toast(message, { id: 'login-required', icon: '🔒' });
  if (navigate) {
    navigate('/login', { state: { from: dest } });
  } else {
    window.location.href = '/login';
  }
};

// Returns true when logged in; otherwise redirects to /login and returns false.
export const requireLogin = (navigate, message = 'Please login to continue', from) => {
  if (isLoggedIn()) return true;
  goToLogin(navigate, message, from);
  return false;
};

// Where to go after a successful login.
export const consumeLoginRedirect = (stateFrom) => {
  let stored = null;
  try {
    stored = sessionStorage.getItem(LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
  } catch { /* storage blocked */ }
  if (stateFrom && typeof stateFrom === 'object') {
    return `${stateFrom.pathname || '/'}${stateFrom.search || ''}`;
  }
  return stateFrom || stored || '/';
};
