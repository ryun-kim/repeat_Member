// src/components/Auth.js
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// Firestore에 직접 아이디/패스워드 저장 및 인증 (실제 서비스에서는 보안상 권장하지 않음)
function Auth() {
  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const [birth, setBirth] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userRef = doc(db, "users", memberId);
      if (isLogin) {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setError("존재하지 않는 아이디입니다.");
          return;
        }
        const data = userSnap.data();
        if (data.password !== password) {
          setError("비밀번호가 틀렸습니다.");
          return;
        }
        setUser({ memberId, birth: data.birth });
      } else {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setError("이미 존재하는 아이디입니다.");
          return;
        }
        // 회원가입 시 DB에 저장 (생년월일 포함)
        await setDoc(userRef, { password, birth });
        window.alert("회원가입되었습니다.");
        setIsLogin(true);
        setMemberId("");
        setPassword("");
        setBirth("");
        navigate("/auth");
      }
    } catch (err) {
      setError(err.message || JSON.stringify(err));
      // 회원가입/로그인 에러는 무시
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMemberId("");
    setPassword("");
    setBirth("");
    setError("");
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <div className="card shadow">
        <div className="card-body">
          <h2 className="card-title mb-4 text-center">{isLogin ? "로그인" : "회원가입"}</h2>
          {user ? (
            <div className="text-center">
              <p className="mb-3">{user.memberId}님 환영합니다!</p>
              {user.birth && <p className="mb-3">생년월일: {user.birth}</p>}
              <button className="btn btn-danger w-100" onClick={handleLogout}>로그아웃</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="아이디"
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="비밀번호"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {!isLogin && (
                <div className="mb-3">
                  <label className="form-label">생년월일</label>
                  <input
                    type="date"
                    className="form-control"
                    value={birth}
                    onChange={e => setBirth(e.target.value)}
                    required
                  />
                </div>
              )}
              <button type="submit" className="btn btn-primary w-100 mb-2">
                {isLogin ? "로그인" : "회원가입"}
              </button>
              <button
                type="button"
                className="btn btn-secondary w-100"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "회원가입으로" : "로그인으로"}
              </button>
              {error && <div className="alert alert-danger mt-3">{error}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;