import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import MemberList from "./components/MemberList";
import MemberView from "./components/MemberView";
import CalendarView from "./components/CalendarView";
import MatchResult from "./components/MatchResult";
import TeamDivider from "./components/TeamDivider";
import AdminManagement from "./components/AdminManagement";
import InstallPrompt from "./components/InstallPrompt";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { setupAdminAccount, authenticateAdmin } from "./setupAdmin";

function Header({ isAdmin, toggleAdmin, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img 
              src="/teamrepeat_logo.png" 
              alt="Repeat Member" 
              style={{ height: '30px', marginRight: '8px' }}
            />
            Repeat Member
          </Link>
          
          {/* 데스크톱 메뉴 */}
          <div className="d-none d-lg-flex align-items-center">
            <Link to="/calendar" className="btn btn-outline-light btn-sm mx-1">📅 달력</Link>
            <Link to="/members" className="btn btn-outline-light btn-sm mx-1">👥 회원목록</Link>
            <Link to="/teams" className="btn btn-outline-light btn-sm mx-1">⚖️ 팀 나누기</Link>
            <Link to="/matchResult" className="btn btn-outline-light btn-sm mx-1">🏆 매치 결과</Link>
            {isAdmin && <Link to="/admin" className="btn btn-outline-warning btn-sm mx-1">🔧 관리자</Link>}
            <button 
              className={`btn btn-sm mx-1 ${isInstalled ? 'btn-success' : isInstallable ? 'btn-outline-success' : 'btn-outline-info'}`}
              onClick={installApp}
              title={isInstalled ? '앱이 설치되었습니다' : isInstallable ? '앱 설치하기' : '앱 설치 방법 보기'}
            >
              {isInstalled ? '✅ 설치됨' : isInstallable ? '📱 앱 설치' : '📱 앱'}
            </button>
            <button 
              className={`btn btn-sm mx-1 ${isAdmin ? 'btn-warning' : 'btn-outline-light'}`}
              onClick={isAdmin ? handleLogout : toggleAdmin}
              title={isAdmin ? '관리자 로그아웃' : '관리자 로그인'}
            >
              {isAdmin ? '🔧 로그아웃' : '🔑 로그인'}
            </button>
          </div>
          
          {/* 모바일 햄버거 버튼 */}
          <button 
            className="mobile-menu-toggle d-lg-none" 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu();
            }}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation"
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              fontSize: '1.5rem',
              padding: '0.5rem',
              cursor: 'pointer',
              zIndex: 1001
            }}
          >
            <span className="hamburger-icon">☰</span>
          </button>
          
          {/* 모바일 메뉴 */}
          {isMenuOpen && (
            <div 
              className="mobile-menu d-lg-none"
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: '#0d6efd',
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                minWidth: '250px',
                maxWidth: '300px'
              }}
            >
              <div className="mobile-menu-content">
                <Link to="/calendar" className="mobile-menu-item" onClick={closeMenu}>📅 달력</Link>
                <Link to="/members" className="mobile-menu-item" onClick={closeMenu}>👥 회원목록</Link>
                <Link to="/teams" className="mobile-menu-item" onClick={closeMenu}>⚖️ 팀 나누기</Link>
                <Link to="/matchResult" className="mobile-menu-item" onClick={closeMenu}>🏆 매치 결과</Link>
                {isAdmin && <Link to="/admin" className="mobile-menu-item" onClick={closeMenu}>🔧 관리자</Link>}
                
                <div className="mobile-menu-divider"></div>
                
                <button 
                  className={`mobile-menu-button ${isInstalled ? 'mobile-menu-button-success' : isInstallable ? 'mobile-menu-button-success' : 'mobile-menu-button-info'}`}
                  onClick={() => {
                    installApp();
                    closeMenu();
                  }}
                >
                  {isInstalled ? '✅ 앱 설치됨' : isInstallable ? '📱 앱 설치' : '📱 앱 설치 방법'}
                </button>
                
                <button 
                  className={`mobile-menu-button ${isAdmin ? 'mobile-menu-button-warning' : 'mobile-menu-button-light'}`}
                  onClick={() => {
                    if (isAdmin) {
                      handleLogout();
                    } else {
                      toggleAdmin();
                    }
                    closeMenu();
                  }}
                >
                  {isAdmin ? '🔧 로그아웃' : '🔑 로그인'}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
      <div className="header-spacer"></div>
    </header>
  );
}


function Layout({ children, isAdmin, toggleAdmin, handleLogout }) {
  return (
    <>
      <Header isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout} />
      <main>
        {children}
      </main>
    </>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // 앱 시작 시 관리자 계정 설정
  useEffect(() => {
    try {
      setupAdminAccount();
    } catch (error) {
      // 관리자 계정 설정 오류는 무시
    }
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem('isAdmin');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateAdmin(loginData.username, loginData.password);
      
      if (result.success) {
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
        setShowLoginModal(false);
        setLoginData({ username: "", password: "" });
        alert("관리자 모드로 전환되었습니다.");
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    alert("일반 모드로 전환되었습니다.");
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><CalendarView isAdmin={isAdmin} /></Layout>} />
        <Route path="/members" element={
          <Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}>
            {isAdmin ? <MemberList /> : <MemberView />}
          </Layout>
        } />
        <Route path="/calendar" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><CalendarView isAdmin={isAdmin} /></Layout>} />
        <Route path="/teams" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><TeamDivider isAdmin={isAdmin} /></Layout>} />
        <Route path="/matchResult" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><MatchResult /></Layout>} />
        <Route path="/admin" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><AdminManagement /></Layout>} />
      </Routes>

      {/* 관리자 로그인 모달 */}
      {showLoginModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🔧 관리자 로그인</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginData({ username: "", password: "" });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">아이디</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    placeholder="아이디를 입력하세요"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">비밀번호</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    placeholder="비밀번호를 입력하세요"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginData({ username: "", password: "" });
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "로그인 중..." : "로그인"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </Router>
  );
}

export default App;