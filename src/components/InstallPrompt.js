import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowInstallPrompt(true);
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Store dismissal in localStorage to avoid showing again immediately
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if user dismissed recently
  if (!showInstallPrompt || localStorage.getItem('installPromptDismissed') === 'true') {
    return null;
  }

  return (
    <div className="position-fixed bottom-0 start-0 end-0 p-3" style={{ zIndex: 1050 }}>
      <div className="card shadow-lg border-0">
        <div className="card-body d-flex align-items-center">
          <div className="me-3">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
              <span className="text-white fs-4">🏀</span>
            </div>
          </div>
          <div className="flex-grow-1">
            <h6 className="card-title mb-1">앱으로 설치하기</h6>
            <p className="card-text small text-muted mb-0">
              Repeat Member를 홈 화면에 추가하여 더 빠르게 접근하세요!
            </p>
          </div>
          <div className="ms-3">
            <button
              className="btn btn-primary btn-sm me-2"
              onClick={handleInstallClick}
            >
              설치
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleDismiss}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
