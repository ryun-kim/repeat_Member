import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "bootstrap/dist/css/bootstrap.min.css";

function MemberView() {
  const [members, setMembers] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // 정렬 기준

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const memberArr = [];
        querySnapshot.forEach((doc) => {
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
          recentGames: data.recentGames || ["", "", "", "", ""],
        });
        });
        setMembers(memberArr);
      } catch (error) {
        console.error("회원 목록 가져오기 오류:", error);
      }
    };
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

  // 포지션별 색상 반환 함수
  const getPositionColor = (position) => {
    switch (position) {
      case '가드':
        return 'bg-success'; // 초록색
      case '포워드':
        return 'bg-primary'; // 파란색
      case '센터':
        return 'bg-danger'; // 빨간색
      default:
        return 'bg-secondary';
    }
  };

  // 상세 포지션별 색상 반환 함수
  const getDetailPositionColor = (detailPosition) => {
    switch (detailPosition) {
      case 'PG':
        return 'bg-success'; // 초록색
      case 'SG':
        return 'bg-warning'; // 노란색
      case 'SF':
        return 'bg-primary'; // 파란색
      case 'PF':
        return 'bg-purple'; // 보라색
      case 'C':
        return 'bg-danger'; // 빨간색
      default:
        return 'bg-secondary';
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
          
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="table table-bordered table-hover">
          <thead className="table-primary">
            <tr>
              <th className="text-center">이름(아이디)</th>
              <th className="text-center">포지션</th>
              <th className="text-center">승</th>
              <th className="text-center">패</th>
              <th className="text-center">승률</th>
              <th className="text-center">최근 성적</th>
              <th className="text-center" style={{ width: '150px' }}>위닝 시리즈</th>
            </tr>
          </thead>
          <tbody>
            {sortMembers(members, sortBy).map(member => (
              <tr key={member.nm}>
                <td className="text-center">{member.name}</td>
                <td className="text-center">
                  {member.detailPosition ? (
                    <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                      {member.detailPosition}
                    </span>
                  ) : (
                    <span className="badge bg-secondary">-</span>
                  )}
                </td>
                <td className="text-center">{member.wins}</td>
                <td className="text-center">{member.losses}</td>
                <td className="text-center">{getWinRate(member.wins, member.losses)}</td>
                <td className="text-center">
                  {renderRecentGames(member.recentGames)}
                </td>
                <td className="text-center">
                  <span className={`badge ${member.winningSeries > 0 ? 'bg-warning' : 'bg-secondary'}`}>
                    {member.winningSeries}승
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MemberView;
