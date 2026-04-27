import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      const errorParams = new URLSearchParams({
        msg: params.get('msg') || 'Missing authentication token',
      });
      window.location.replace(`/auth/error?${errorParams.toString()}`);
      return;
    }

    window.localStorage.setItem('token', token);
    window.localStorage.setItem('isLougOutManual', 'false');
    window.location.replace('/');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
