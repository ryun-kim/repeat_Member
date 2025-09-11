import React, { useState, useEffect } from "react";
import { addAdmin, getAdminList } from "../setupAdmin";
import "bootstrap/dist/css/bootstrap.min.css";

function AdminManagement() {
  const [adminList, setAdminList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", role: "admin" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 관리자 목록 로드
  const loadAdminList = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminList();
      if (result.success) {
        setAdminList(result.adminList);
      } else {
        setMessage("관리자 목록을 불러오는데 실패했습니다: " + result.message);
      }
    } catch (error) {
      console.error("관리자 목록 로드 오류:", error);
      setMessage("관리자 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminList();
  }, []);

  // 새 관리자 추가
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) {
      setMessage("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await addAdmin(newAdmin.username, newAdmin.password, newAdmin.role);
      if (result.success) {
        setMessage("관리자가 추가되었습니다.");
        setNewAdmin({ username: "", password: "", role: "admin" });
        setShowAddForm(false);
        loadAdminList(); // 목록 새로고침
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      console.error("관리자 추가 오류:", error);
      setMessage("관리자 추가 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "없음";
    return new Date(date.seconds * 1000).toLocaleString("ko-KR");
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">🔧 관리자 계정 관리</h2>
          
          {message && (
            <div className={`alert ${message.includes("성공") || message.includes("추가") ? "alert-success" : "alert-danger"}`}>
              {message}
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>관리자 목록</h4>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "취소" : "새 관리자 추가"}
            </button>
          </div>

          {showAddForm && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">새 관리자 추가</h5>
                <form onSubmit={handleAddAdmin}>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">아이디</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newAdmin.username}
                          onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                          placeholder="관리자 아이디"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">비밀번호</label>
                        <input
                          type="password"
                          className="form-control"
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                          placeholder="비밀번호"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">권한</label>
                        <select
                          className="form-select"
                          value={newAdmin.role}
                          onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                        >
                          <option value="admin">관리자</option>
                          <option value="super_admin">최고관리자</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success" disabled={isLoading}>
                      {isLoading ? "추가 중..." : "추가"}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAdmin({ username: "", password: "", role: "admin" });
                        setMessage("");
                      }}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>권한</th>
                  <th>생성일</th>
                  <th>마지막 로그인</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : adminList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center">관리자가 없습니다.</td>
                  </tr>
                ) : (
                  adminList.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.username}</td>
                      <td>
                        <span className={`badge ${admin.role === 'super_admin' ? 'bg-danger' : 'bg-primary'}`}>
                          {admin.role === 'super_admin' ? '최고관리자' : '관리자'}
                        </span>
                      </td>
                      <td>{formatDate(admin.createdAt)}</td>
                      <td>{formatDate(admin.lastLogin)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <button 
              className="btn btn-outline-primary"
              onClick={loadAdminList}
              disabled={isLoading}
            >
              {isLoading ? "새로고침 중..." : "새로고침"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminManagement;
