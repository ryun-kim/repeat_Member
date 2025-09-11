import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import "bootstrap/dist/css/bootstrap.min.css";

function MemberList() {
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // 정렬 기준
  const [formData, setFormData] = useState({
    nm: "",
    birth: "",
    wins: 0,
    losses: 0,
    recentRecord: "",
    winningSeries: 0,
    position: "",
    detailPosition: "",
    recentGames: ["", "", "", ""] // 최근 4경기 기록 (W/L)
  });

  // 회원 목록 가져오기 함수
  const fetchMembers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const memberArr = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        memberArr.push({
          nm: doc.id,
          name: data.name || doc.id,
          birth: data.birth || "",
          wins: data.wins || 0,
          losses: data.losses || 0,
          recentRecord: data.recentRecord || "",
          winningSeries: data.winningSeries || 0,
          position: data.position || "",
          detailPosition: data.detailPosition || "",
          recentGames: data.recentGames || ["", "", "", ""],
        });
      });
      setMembers(memberArr);
    } catch (error) {
      console.error("회원 목록 가져오기 오류:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 승률 계산 함수
  const getWinRate = (wins, losses) => {
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(2) + "%" : "0%";
  };

  // 정렬 함수
  const sortMembers = (members, sortBy) => {
    const sortedMembers = [...members];
    
    switch (sortBy) {
      case 'name':
        return sortedMembers.sort((a, b) => a.name.localeCompare(b.name));
      case 'wins':
        return sortedMembers.sort((a, b) => b.wins - a.wins);
      case 'losses':
        return sortedMembers.sort((a, b) => b.losses - a.losses);
      case 'winRate':
        return sortedMembers.sort((a, b) => {
          const aWinRate = a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) : 0;
          const bWinRate = b.wins + b.losses > 0 ? (b.wins / (b.wins + b.losses)) : 0;
          return bWinRate - aWinRate;
        });
      default:
        return sortedMembers;
    }
  };

  // 최근 5경기 기록 표시 함수
  const renderRecentGames = (recentGames) => {
    return recentGames.map((game, index) => {
      if (!game) return <span key={index} className="badge bg-secondary me-1">-</span>;
      return (
        <span 
          key={index} 
          className={`badge me-1 ${game === 'W' ? 'bg-success' : game === 'L' ? 'bg-danger' : 'bg-secondary'}`}
        >
          {game}
        </span>
      );
    });
  };

  // 폼 데이터 초기화
  const resetForm = () => {
    setFormData({
      nm: "",
      birth: "",
      wins: 0,
      losses: 0,
      recentRecord: "",
      winningSeries: 0,
      position: "",
      detailPosition: "",
      recentGames: ["", "", "", ""]
    });
  };

  // 회원 추가
  const handleAddMember = async () => {
    if (!formData.nm.trim()) {
      alert("회원명을 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "users"), {
        name: formData.nm,
        birth: formData.birth,
        wins: parseInt(formData.wins),
        losses: parseInt(formData.losses),
        recentRecord: formData.recentRecord,
        winningSeries: parseInt(formData.winningSeries),
        position: formData.position,
        detailPosition: formData.detailPosition,
        recentGames: formData.recentGames
      });
      
      alert("회원이 성공적으로 추가되었습니다!");
      setShowAddModal(false);
      resetForm();
      // 목록 새로고침
      fetchMembers();
    } catch (error) {
      console.error("회원 추가 중 오류:", error);
      alert("회원 추가 중 오류가 발생했습니다.");
    }
  };

  // 회원 수정
  const handleEditMember = async () => {
    if (!editingMember) return;

    try {
      await updateDoc(doc(db, "users", editingMember.nm), {
        birth: formData.birth,
        wins: parseInt(formData.wins),
        losses: parseInt(formData.losses),
        recentRecord: formData.recentRecord,
        winningSeries: parseInt(formData.winningSeries),
        position: formData.position,
        detailPosition: formData.detailPosition,
        recentGames: formData.recentGames
      });
      
      alert("회원 정보가 성공적으로 수정되었습니다!");
      setShowEditModal(false);
      setEditingMember(null);
      resetForm();
      // 목록 새로고침
      fetchMembers();
    } catch (error) {
      console.error("회원 수정 중 오류:", error);
      alert("회원 수정 중 오류가 발생했습니다.");
    }
  };

  // 수정 모달 열기
  const openEditModal = (member) => {
    setEditingMember(member);
    setFormData({
      nm: member.name,
      birth: member.birth,
      wins: member.wins,
      losses: member.losses,
      recentRecord: member.recentRecord,
      winningSeries: member.winningSeries,
      position: member.position,
      detailPosition: member.detailPosition,
      recentGames: member.recentGames || ["", "", "", ""]
    });
    setShowEditModal(true);
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>회원 목록</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="sortSelect" className="form-label mb-0">정렬:</label>
            <select
              id="sortSelect"
              className="form-select"
              style={{ width: 'auto' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">이름순</option>
              <option value="wins">승리순</option>
              <option value="losses">패배순</option>
              <option value="winRate">승률순</option>
            </select>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            + 회원 추가
          </button>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="table table-bordered table-hover">
          <thead className="table-primary">
            <tr>
              <th>이름(아이디)</th>
              <th>생년월일</th>
              <th>포지션</th>
              <th>승</th>
              <th>패</th>
              <th>승률</th>
              <th>최근 성적</th>
              <th>위닝 시리즈</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {sortMembers(members, sortBy).map(member => (
              <tr key={member.nm}>
                <td>{member.name}</td>
                <td>{member.birth}</td>
                <td>
                  <span className="badge bg-info me-1">{member.position || '-'}</span>
                  {member.detailPosition && (
                    <span className="badge bg-secondary">{member.detailPosition}</span>
                  )}
                </td>
                <td>{member.wins}</td>
                <td>{member.losses}</td>
                <td>{getWinRate(member.wins, member.losses)}</td>
                <td>
                  {renderRecentGames(member.recentGames)}
                </td>
                <td>
                  <span className={`badge ${member.winningSeries > 0 ? 'bg-warning' : 'bg-secondary'}`}>
                    {member.winningSeries}승
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openEditModal(member)}
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 회원 추가 모달 */}
      {showAddModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">회원 추가</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">회원명</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nm}
                    onChange={(e) => setFormData({...formData, nm: e.target.value})}
                    placeholder="회원명을 입력하세요"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">생년월일</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.birth}
                    onChange={(e) => setFormData({...formData, birth: e.target.value})}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">포지션</label>
                      <select
                        className="form-select"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value, detailPosition: ""})}
                      >
                        <option value="">선택하세요</option>
                        <option value="가드">가드</option>
                        <option value="포워드">포워드</option>
                        <option value="센터">센터</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">상세 포지션</label>
                      <select
                        className="form-select"
                        value={formData.detailPosition}
                        onChange={(e) => setFormData({...formData, detailPosition: e.target.value})}
                        disabled={!formData.position}
                      >
                        <option value="">선택하세요</option>
                        {formData.position === "가드" && (
                          <>
                            <option value="PG">PG (포인트가드)</option>
                            <option value="SG">SG (슈팅가드)</option>
                          </>
                        )}
                        {formData.position === "포워드" && (
                          <>
                            <option value="SF">SF (스몰포워드)</option>
                            <option value="PF">PF (파워포워드)</option>
                          </>
                        )}
                        {formData.position === "센터" && (
                          <option value="C">C (센터)</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">승</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.wins}
                        onChange={(e) => setFormData({...formData, wins: e.target.value})}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">패</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.losses}
                        onChange={(e) => setFormData({...formData, losses: e.target.value})}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">최근 성적</label>
                  <select
                    className="form-select"
                    value={formData.recentRecord}
                    onChange={(e) => setFormData({...formData, recentRecord: e.target.value})}
                  >
                    <option value="">선택하세요</option>
                    <option value="승">승</option>
                    <option value="패">패</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">위닝 시리즈</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.winningSeries}
                    onChange={(e) => setFormData({...formData, winningSeries: e.target.value})}
                    min="0"
                    placeholder="연승 횟수"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">최근 4경기 기록</label>
                  <div className="row">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="col-2 mb-2">
                        <select
                          className="form-select form-select-sm"
                          value={formData.recentGames[index] || ""}
                          onChange={(e) => {
                            const newRecentGames = [...formData.recentGames];
                            newRecentGames[index] = e.target.value;
                            setFormData({...formData, recentGames: newRecentGames});
                          }}
                        >
                          <option value="">-</option>
                          <option value="W">W</option>
                          <option value="L">L</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <small className="text-muted">최근 경기부터 순서대로 입력하세요 (W: 승리, L: 패배)</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddMember}>
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 수정 모달 */}
      {showEditModal && (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">회원 수정 - {editingMember?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">생년월일</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.birth}
                    onChange={(e) => setFormData({...formData, birth: e.target.value})}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">포지션</label>
                      <select
                        className="form-select"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value, detailPosition: ""})}
                      >
                        <option value="">선택하세요</option>
                        <option value="가드">가드</option>
                        <option value="포워드">포워드</option>
                        <option value="센터">센터</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">상세 포지션</label>
                      <select
                        className="form-select"
                        value={formData.detailPosition}
                        onChange={(e) => setFormData({...formData, detailPosition: e.target.value})}
                        disabled={!formData.position}
                      >
                        <option value="">선택하세요</option>
                        {formData.position === "가드" && (
                          <>
                            <option value="PG">PG (포인트가드)</option>
                            <option value="SG">SG (슈팅가드)</option>
                          </>
                        )}
                        {formData.position === "포워드" && (
                          <>
                            <option value="SF">SF (스몰포워드)</option>
                            <option value="PF">PF (파워포워드)</option>
                          </>
                        )}
                        {formData.position === "센터" && (
                          <option value="C">C (센터)</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">승</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.wins}
                        onChange={(e) => setFormData({...formData, wins: e.target.value})}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">패</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.losses}
                        onChange={(e) => setFormData({...formData, losses: e.target.value})}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">최근 성적</label>
                  <select
                    className="form-select"
                    value={formData.recentRecord}
                    onChange={(e) => setFormData({...formData, recentRecord: e.target.value})}
                  >
                    <option value="">선택하세요</option>
                    <option value="승">승</option>
                    <option value="패">패</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">위닝 시리즈</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.winningSeries}
                    onChange={(e) => setFormData({...formData, winningSeries: e.target.value})}
                    min="0"
                    placeholder="연승 횟수"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">최근 4경기 기록</label>
                  <div className="row">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="col-2 mb-2">
                        <select
                          className="form-select form-select-sm"
                          value={formData.recentGames[index] || ""}
                          onChange={(e) => {
                            const newRecentGames = [...formData.recentGames];
                            newRecentGames[index] = e.target.value;
                            setFormData({...formData, recentGames: newRecentGames});
                          }}
                        >
                          <option value="">-</option>
                          <option value="W">W</option>
                          <option value="L">L</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <small className="text-muted">최근 경기부터 순서대로 입력하세요 (W: 승리, L: 패배)</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" onClick={handleEditMember}>
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberList;