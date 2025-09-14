import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function DownloadApp() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
    setIsInstallable(false);
  };

  const handleManualInstall = () => {
    // Show manual install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = `
iOS에서 앱 설치 방법:
1. Safari 브라우저에서 이 페이지를 열어주세요
2. 하단의 공유 버튼(📤)을 탭하세요
3. "홈 화면에 추가"를 선택하세요
4. "추가" 버튼을 탭하세요
      `;
    } else if (isAndroid) {
      instructions = `
Android에서 앱 설치 방법:
1. Chrome 브라우저에서 이 페이지를 열어주세요
2. 주소창 옆의 메뉴(⋮)를 탭하세요
3. "앱 설치" 또는 "홈 화면에 추가"를 선택하세요
4. "설치" 버튼을 탭하세요
      `;
    } else {
      instructions = `
데스크톱에서 앱 설치 방법:
1. Chrome 브라우저에서 이 페이지를 열어주세요
2. 주소창 옆의 설치 아이콘(⬇️)을 클릭하세요
3. "설치" 버튼을 클릭하세요
      `;
    }
    
    alert(instructions);
  };

  if (isInstalled) {
    return (
      <div className="alert alert-success d-flex align-items-center" role="alert">
        <span className="me-2">✅</span>
        <div>
          <strong>앱이 설치되었습니다!</strong><br />
          <small>홈 화면에서 Repeat Member 앱을 실행하세요.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body text-center">
        <div className="mb-3">
          <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
               style={{ width: '80px', height: '80px' }}>
            <span className="text-white" style={{ fontSize: '2.5rem' }}>🏀</span>
          </div>
          <h4 className="card-title">Repeat Member 앱 다운로드</h4>
          <p className="card-text text-muted">
            모바일에서 더 편리하게 사용하세요!<br />
            홈 화면에 추가하여 네이티브 앱처럼 사용할 수 있습니다.
          </p>
        </div>
        
        <div className="d-grid gap-2 d-md-block">
          {isInstallable ? (
            <button 
              className="btn btn-primary btn-lg me-2"
              onClick={handleInstallClick}
            >
              📱 지금 설치하기
            </button>
          ) : (
            <button 
              className="btn btn-outline-primary btn-lg me-2"
              onClick={handleManualInstall}
            >
              📱 설치 방법 보기
            </button>
          )}
          
          <button 
            className="btn btn-outline-secondary btn-lg"
            onClick={() => window.open('https://support.google.com/chrome/answer/9658361', '_blank')}
          >
            ❓ 도움말
          </button>
        </div>
        
        <div className="mt-3">
          <small className="text-muted">
            💡 <strong>팁:</strong> Chrome, Safari, Edge 브라우저에서 최적의 경험을 제공합니다.
          </small>
        </div>
      </div>
    </div>
  );
}

export default DownloadApp;
