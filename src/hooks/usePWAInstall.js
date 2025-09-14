import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
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

  const installApp = async () => {
    if (!deferredPrompt) {
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
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      // User accepted the install prompt
    } else {
      // User dismissed the install prompt
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    isInstalled,
    installApp
  };
};
