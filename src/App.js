import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import MemberList from "./components/MemberList";
import MemberView from "./components/MemberView";
import CalendarView from "./components/CalendarView";
import MatchResult from "./components/MatchResult";
import TeamDivider from "./components/TeamDivider";
import AdminManagement from "./components/AdminManagement";
import { setupAdminAccount, authenticateAdmin } from "./setupAdmin";

function Header({ isAdmin, toggleAdmin, handleLogout }) {
  return (
    <header>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container">
          <Link className="navbar-brand" to="/">🏀 Repeat Member 농구팀</Link>
          <div className="d-flex align-items-center">
            <Link to="/calendar" className="btn btn-outline-light mx-1">달력</Link>
            <Link to="/members" className="btn btn-outline-light mx-1">회원목록</Link>
            <Link to="/teams" className="btn btn-outline-light mx-1">팀 나누기</Link>
            <Link to="/matchResult" className="btn btn-outline-light mx-1">매치 결과</Link>
            {isAdmin && <Link to="/admin" className="btn btn-outline-warning mx-1">🔧 관리자 관리</Link>}
            
            <button 
              className={`btn mx-1 ${isAdmin ? 'btn-warning' : 'btn-outline-light'}`}
              onClick={isAdmin ? handleLogout : toggleAdmin}
              title={isAdmin ? '관리자 로그아웃' : '관리자 로그인'}
            >
              {isAdmin ? '🔧 관리자 로그아웃' : '🔑 관리자 로그인'}
            </button>
          </div>
        </div>
      </nav>
      <div style={{ height: "70px" }}></div>
    </header>
  );
}

function Home() {
  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4 text-center">🏀 Repeat Member 농구팀</h2>
          <p className="lead text-center mb-4">팀 Repeat를 위한 공간입니다</p>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <CalendarView />
        </div>
      </div>
    </div>
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
  const [isAdmin, setIsAdmin] = useState(() => {
    // localStorage에서 관리자 모드 상태 복원
    const savedAdminState = localStorage.getItem('isAdmin');
    return savedAdminState === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // 앱 시작 시 관리자 계정 설정
  useEffect(() => {
    setupAdminAccount();
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      // 관리자 모드 해제
      setIsAdmin(false);
      localStorage.removeItem('isAdmin');
    } else {
      // 관리자 모드 진입 시 로그인 모달 표시
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
      console.error("로그인 오류:", error);
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
        <Route path="/teams" element={<Layout isAdmin={isAdmin} toggleAdmin={toggleAdmin} handleLogout={handleLogout}><TeamDivider /></Layout>} />
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
    </Router>
  );
}

export default App;