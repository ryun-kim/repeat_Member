// src/components/TeamDivider.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

function TeamDivider() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamC, setTeamC] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamMode, setTeamMode] = useState(2); // 2팀 또는 3팀 모드
  const [savedTeamConfig, setSavedTeamConfig] = useState(null);
  const [savedMatchResult, setSavedMatchResult] = useState(null);

  // 이벤트 목록 가져오기
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "events"));
        const eventList = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 00:00:00으로 설정
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const eventDate = new Date(data.date);
          eventDate.setHours(0, 0, 0, 0); // 이벤트 날짜 00:00:00으로 설정
          
          // 오늘 날짜 이후의 모임만 포함
          if (eventDate >= today) {
            eventList.push({
              id: doc.id,
              title: data.title,
              date: data.date,
              color: data.color || "#007bff"
            });
          }
        });
        // 날짜순으로 정렬
        eventList.sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(eventList);
      } catch (error) {
        console.error("이벤트 목록 가져오기 오류:", error);
      }
    };
    fetchEvents();
  }, []);

  // 회원 목록 가져오기
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const memberList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          memberList.push({
            id: doc.id,
            name: data.name || doc.id,
            position: data.position || "",
            detailPosition: data.detailPosition || ""
          });
        });
        setMembers(memberList);
      } catch (error) {
        console.error("회원 목록 가져오기 오류:", error);
      }
    };
    fetchMembers();
  }, []);

  // 선택된 이벤트의 참석 데이터 가져오기
  useEffect(() => {
    if (selectedEvent) {
      const fetchAttendance = async () => {
        try {
          const q = query(
            collection(db, "attendance"),
            where("eventId", "==", selectedEvent.id),
            where("status", "==", "참석")
          );
          const querySnapshot = await getDocs(q);
          const attendanceList = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            attendanceList.push({
              id: doc.id,
              memberName: data.memberName,
              status: data.status
            });
          });
          setAttendanceData(attendanceList);
        } catch (error) {
          console.error("참석 데이터 가져오기 오류:", error);
        }
      };
      fetchAttendance();
    }
  }, [selectedEvent]);

  // 팀 나누기 함수
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const divideTeams = () => {
    if (attendanceData.length === 0) {
      setTeamA([]);
      setTeamB([]);
      setTeamC([]);
      return;
    }

    // 참석자들의 포지션 정보를 포함한 배열 생성
    const participantsWithPosition = attendanceData.map(attendance => {
      const member = members.find(m => m.name === attendance.memberName);
      return {
        name: attendance.memberName,
        position: member?.position || "",
        detailPosition: member?.detailPosition || ""
      };
    });

    // 포지션별로 그룹화
    const positionGroups = {
      가드: participantsWithPosition.filter(p => p.position === "가드"),
      포워드: participantsWithPosition.filter(p => p.position === "포워드"),
      센터: participantsWithPosition.filter(p => p.position === "센터"),
      기타: participantsWithPosition.filter(p => !p.position || !["가드", "포워드", "센터"].includes(p.position))
    };

    // 각 포지션별로 팀 나누기
    const teamA = [];
    const teamB = [];
    const teamC = [];

    Object.keys(positionGroups).forEach(position => {
      const players = positionGroups[position];
      if (players.length === 0) return;

      const shuffled = shuffleArray([...players]);
      
      if (teamMode === 2) {
        // 2팀 모드
        const midPoint = Math.ceil(shuffled.length / 2);
        teamA.push(...shuffled.slice(0, midPoint));
        teamB.push(...shuffled.slice(midPoint));
      } else {
        // 3팀 모드
        const thirdPoint = Math.ceil(shuffled.length / 3);
        const twoThirdPoint = Math.ceil(shuffled.length * 2 / 3);
        
        teamA.push(...shuffled.slice(0, thirdPoint));
        teamB.push(...shuffled.slice(thirdPoint, twoThirdPoint));
        teamC.push(...shuffled.slice(twoThirdPoint));
      }
    });

    // 최종적으로 섞기
    setTeamA(shuffleArray(teamA));
    setTeamB(shuffleArray(teamB));
    if (teamMode === 3) {
      setTeamC(shuffleArray(teamC));
    } else {
      setTeamC([]);
    }
  };

  // 저장된 팀 구성 불러오기
  const loadSavedTeamConfig = async (eventId) => {
    try {
      const q = query(
        collection(db, "teamConfigurations"),
        where("eventId", "==", eventId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const config = querySnapshot.docs[0].data();
        setSavedTeamConfig(config);
        setTeamA(config.teamA || []);
        setTeamB(config.teamB || []);
        setTeamC(config.teamC || []);
        setTeamMode(config.teamMode || 2);
      }
    } catch (error) {
      console.error("팀 구성 불러오기 오류:", error);
    }
  };

  // 저장된 매치 결과 불러오기
  const loadSavedMatchResult = async (eventId) => {
    try {
      const q = query(
        collection(db, "matchResults"),
        where("eventId", "==", eventId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const result = querySnapshot.docs[0].data();
        setSavedMatchResult(result);
      }
    } catch (error) {
      console.error("매치 결과 불러오기 오류:", error);
    }
  };

  // 이벤트 선택 핸들러
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    // 팀나누기 결과 초기화
    setTeamA([]);
    setTeamB([]);
    setTeamC([]);
    setSavedTeamConfig(null);
    setSavedMatchResult(null);
    loadSavedTeamConfig(event.id);
    loadSavedMatchResult(event.id);
  };

  // 팀 나누기 버튼 클릭
  const handleDivideTeams = () => {
    if (attendanceData.length === 0) {
      alert("참석한 회원이 없습니다.");
      return;
    }
    divideTeams();
  };

  // 팀별 포지션 균형 계산
  const getTeamPositionBalance = (team) => {
    const balance = {
      가드: 0,
      포워드: 0,
      센터: 0,
      기타: 0
    };
    
    team.forEach(player => {
      const position = player.position || "기타";
      if (["가드", "포워드", "센터"].includes(position)) {
        balance[position]++;
      } else {
        balance.기타++;
      }
    });
    
    return balance;
  };

  // 선수 이동 함수
  const movePlayer = (player, fromTeam, toTeam) => {
    const fromTeamState = fromTeam === 'A' ? teamA : fromTeam === 'B' ? teamB : teamC;
    const toTeamState = toTeam === 'A' ? teamA : toTeam === 'B' ? teamB : teamC;
    
    const updatedFromTeam = fromTeamState.filter(p => p.name !== player.name);
    const updatedToTeam = [...toTeamState, player];
    
    if (fromTeam === 'A') setTeamA(updatedFromTeam);
    else if (fromTeam === 'B') setTeamB(updatedFromTeam);
    else setTeamC(updatedFromTeam);
    
    if (toTeam === 'A') setTeamA(updatedToTeam);
    else if (toTeam === 'B') setTeamB(updatedToTeam);
    else setTeamC(updatedToTeam);
  };

  // 팀별 섞기 함수
  const shuffleTeam = (team) => {
    if (team === 'A') setTeamA(shuffleArray([...teamA]));
    else if (team === 'B') setTeamB(shuffleArray([...teamB]));
    else if (team === 'C') setTeamC(shuffleArray([...teamC]));
  };

  // 전체 초기화
  const resetTeams = () => {
    setTeamA([]);
    setTeamB([]);
    setTeamC([]);
  };

  // 팀 구성 저장
  const saveTeamConfiguration = async () => {
    if (!selectedEvent || (teamA.length === 0 && teamB.length === 0 && teamC.length === 0)) {
      alert("저장할 팀 구성이 없습니다.");
      return;
    }

    try {
      const teamConfig = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        teamMode: teamMode,
        teamA: teamA,
        teamB: teamB,
        teamC: teamC,
        createdAt: new Date().toISOString()
      };

      // 기존 팀 구성이 있는지 확인
      const existingConfigQuery = query(
        collection(db, "teamConfigurations"),
        where("eventId", "==", selectedEvent.id)
      );
      const existingConfigSnapshot = await getDocs(existingConfigQuery);
      
      if (!existingConfigSnapshot.empty) {
        // 기존 구성 업데이트
        const existingDoc = existingConfigSnapshot.docs[0];
        await updateDoc(doc(db, "teamConfigurations", existingDoc.id), teamConfig);
        alert("팀 구성이 업데이트되었습니다!");
      } else {
        // 새 구성 저장
        await addDoc(collection(db, "teamConfigurations"), teamConfig);
        alert("팀 구성이 저장되었습니다!");
      }
    } catch (error) {
      console.error("팀 구성 저장 중 오류:", error);
      alert("팀 구성 저장 중 오류가 발생했습니다.");
    }
  };

  // 팀 내에서 선수 순서 변경
  const movePlayerInTeam = (team, playerIndex, direction) => {
    const teamState = team === 'A' ? teamA : team === 'B' ? teamB : teamC;
    const newTeam = [...teamState];
    
    if (direction === 'up' && playerIndex > 0) {
      [newTeam[playerIndex - 1], newTeam[playerIndex]] = [newTeam[playerIndex], newTeam[playerIndex - 1]];
    } else if (direction === 'down' && playerIndex < newTeam.length - 1) {
      [newTeam[playerIndex], newTeam[playerIndex + 1]] = [newTeam[playerIndex + 1], newTeam[playerIndex]];
    }
    
    if (team === 'A') setTeamA(newTeam);
    else if (team === 'B') setTeamB(newTeam);
    else if (team === 'C') setTeamC(newTeam);
  };


  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4 text-center">🏀 팀 나누기</h2>
          
          {/* 팀 모드 선택 */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">팀 모드 선택</h5>
            </div>
            <div className="card-body">
              <div className="btn-group" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="teamMode"
                  id="team2"
                  checked={teamMode === 2}
                  onChange={() => setTeamMode(2)}
                />
                <label className="btn btn-outline-primary" htmlFor="team2">
                  2팀 모드
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="teamMode"
                  id="team3"
                  checked={teamMode === 3}
                  onChange={() => setTeamMode(3)}
                />
                <label className="btn btn-outline-primary" htmlFor="team3">
                  3팀 모드 (3파전)
                </label>
              </div>
            </div>
          </div>
          
          {/* 모임 선택 */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">모임 선택</h5>
            </div>
            <div className="card-body">
              {events.length > 0 ? (
                <div className="row">
                  {events.map((event) => (
                    <div key={event.id} className="col-md-6 col-lg-4 mb-3">
                      <div 
                        className={`card h-100 cursor-pointer ${selectedEvent?.id === event.id ? 'border-primary' : ''}`}
                        onClick={() => handleEventSelect(event)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-body">
                          <h6 className="card-title">{event.title}</h6>
                          <p className="card-text text-muted">
                            {new Date(event.date).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">등록된 모임이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 선택된 모임 정보 및 참석자 목록 */}
          {selectedEvent && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">선택된 모임: {selectedEvent.title}</h5>
                <small className="text-muted">
                  {new Date(selectedEvent.date).toLocaleDateString('ko-KR')}
                </small>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <h6>참석자 목록 ({attendanceData.length}명)</h6>
                    {attendanceData.length > 0 ? (
                      <div className="row">
                        {attendanceData.map((member, index) => (
                          <div key={index} className="col-4 mb-2">
                            <span className="badge bg-info w-100 text-truncate" style={{ fontSize: '0.8rem' }}>
                              {member.memberName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">참석한 회원이 없습니다.</p>
                    )}
                  </div>
                  <div className="col-md-8 d-flex flex-column align-items-center justify-content-center">
                    <button 
                      className="btn btn-primary btn-lg mb-2"
                      onClick={handleDivideTeams}
                      disabled={attendanceData.length === 0}
                    >
                      팀 나누기
                    </button>
                    <div className="btn-group" role="group">
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => shuffleTeam('A')}
                        disabled={teamA.length === 0}
                        title="A팀 섞기"
                      >
                        A팀 섞기
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => shuffleTeam('B')}
                        disabled={teamB.length === 0}
                        title="B팀 섞기"
                      >
                        B팀 섞기
                      </button>
                      {teamMode === 3 && (
                        <button 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => shuffleTeam('C')}
                          disabled={teamC.length === 0}
                          title="C팀 섞기"
                        >
                          C팀 섞기
                        </button>
                      )}
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={resetTeams}
                        disabled={teamA.length === 0 && teamB.length === 0 && teamC.length === 0}
                        title="선수 목록 초기화"
                      >
                        초기화
                      </button>
                      <button 
                        className="btn btn-outline-success btn-sm"
                        onClick={saveTeamConfiguration}
                        disabled={teamA.length === 0 && teamB.length === 0 && teamC.length === 0}
                        title="팀 구성 저장"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 저장된 팀 구성 표시 */}
          {savedTeamConfig && (teamA.length > 0 || teamB.length > 0 || teamC.length > 0) && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">저장된 팀 구성</h5>
                {savedMatchResult && (
                  <small className="text-muted">(매치 결과도 저장됨)</small>
                )}
              </div>
              <div className="card-body">
                <div className={`row ${teamMode === 3 ? 'row-cols-1 row-cols-md-3' : 'row-cols-1 row-cols-md-2'}`}>
                  {/* A팀 */}
                  <div className="col mb-3">
                    <div className="card border-success h-100">
                      <div className="card-header bg-success text-white">
                        <h6 className="mb-0">🟢 A팀 ({teamA.length}명)</h6>
                        {teamA.length > 0 && (
                          <small>
                            가드: {getTeamPositionBalance(teamA).가드}명 | 
                            포워드: {getTeamPositionBalance(teamA).포워드}명 | 
                            센터: {getTeamPositionBalance(teamA).센터}명
                            {getTeamPositionBalance(teamA).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamA).기타}명`}
                          </small>
                        )}
                      </div>
                      <div className="card-body">
                        {teamA.map((member, index) => (
                          <div key={index} className="mb-2 d-flex align-items-center">
                            <div className="flex-grow-1">
                              <strong>{member.name}</strong>
                              {member.position && (
                                <span className="badge bg-secondary ms-2">{member.position}</span>
                              )}
                              {member.detailPosition && (
                                <span className="badge bg-light text-dark ms-1">{member.detailPosition}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* B팀 */}
                  <div className="col mb-3">
                    <div className="card border-primary h-100">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">🔵 B팀 ({teamB.length}명)</h6>
                        {teamB.length > 0 && (
                          <small>
                            가드: {getTeamPositionBalance(teamB).가드}명 | 
                            포워드: {getTeamPositionBalance(teamB).포워드}명 | 
                            센터: {getTeamPositionBalance(teamB).센터}명
                            {getTeamPositionBalance(teamB).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamB).기타}명`}
                          </small>
                        )}
                      </div>
                      <div className="card-body">
                        {teamB.map((member, index) => (
                          <div key={index} className="mb-2 d-flex align-items-center">
                            <div className="flex-grow-1">
                              <strong>{member.name}</strong>
                              {member.position && (
                                <span className="badge bg-secondary ms-2">{member.position}</span>
                              )}
                              {member.detailPosition && (
                                <span className="badge bg-light text-dark ms-1">{member.detailPosition}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* C팀 (3팀 모드일 때만) */}
                  {teamMode === 3 && (
                    <div className="col mb-3">
                      <div className="card border-warning h-100">
                        <div className="card-header bg-warning text-dark">
                          <h6 className="mb-0">🟡 C팀 ({teamC.length}명)</h6>
                          {teamC.length > 0 && (
                            <small>
                              가드: {getTeamPositionBalance(teamC).가드}명 | 
                              포워드: {getTeamPositionBalance(teamC).포워드}명 | 
                              센터: {getTeamPositionBalance(teamC).센터}명
                              {getTeamPositionBalance(teamC).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamC).기타}명`}
                            </small>
                          )}
                        </div>
                        <div className="card-body">
                          {teamC.map((member, index) => (
                            <div key={index} className="mb-2 d-flex align-items-center">
                              <div className="flex-grow-1">
                                <strong>{member.name}</strong>
                                {member.position && (
                                  <span className="badge bg-secondary ms-2">{member.position}</span>
                                )}
                                {member.detailPosition && (
                                  <span className="badge bg-light text-dark ms-1">{member.detailPosition}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 팀 나누기 결과 */}
          {!savedTeamConfig && (teamA.length > 0 || teamB.length > 0 || teamC.length > 0) && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">팀 나누기 결과</h5>
              </div>
              <div className="card-body">
                <div className={`row ${teamMode === 3 ? 'row-cols-1 row-cols-md-3' : 'row-cols-1 row-cols-md-2'}`}>
                  {/* A팀 */}
                  <div className="col mb-3">
                    <div className="card border-success h-100">
                      <div className="card-header bg-success text-white">
                        <h6 className="mb-0">🟢 A팀 ({teamA.length}명)</h6>
                        {teamA.length > 0 && (
                          <small>
                            가드: {getTeamPositionBalance(teamA).가드}명 | 
                            포워드: {getTeamPositionBalance(teamA).포워드}명 | 
                            센터: {getTeamPositionBalance(teamA).센터}명
                            {getTeamPositionBalance(teamA).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamA).기타}명`}
                          </small>
                        )}
                      </div>
                      <div className="card-body">
                        {teamA.map((member, index) => (
                          <div key={index} className="mb-2 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center flex-grow-1">
                              <div className="btn-group-vertical btn-group-sm me-2">
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayerInTeam('A', index, 'up');
                                  }}
                                  disabled={index === 0}
                                  title="위로 이동"
                                >
                                  ▲
                                </button>
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayerInTeam('A', index, 'down');
                                  }}
                                  disabled={index === teamA.length - 1}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-success me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {(member.position || member.detailPosition) && (
                                  <small className="text-muted">
                                    {member.position && <span className="badge bg-info me-1">{member.position}</span>}
                                    {member.detailPosition && <span className="badge bg-secondary">{member.detailPosition}</span>}
                                  </small>
                                )}
                              </div>
                            </div>
                            <div className="btn-group-vertical btn-group-sm">
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  movePlayer(member, 'A', 'B');
                                }}
                                title="B팀으로 이동"
                              >
                                {teamMode === 3 ? 'B' : '→'}
                              </button>
                              {teamMode === 3 && (
                                <button 
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'A', 'C');
                                  }}
                                  title="C팀으로 이동"
                                >
                                  C
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* B팀 */}
                  <div className="col mb-3">
                    <div className="card border-primary h-100">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">🔵 B팀 ({teamB.length}명)</h6>
                        {teamB.length > 0 && (
                          <small>
                            가드: {getTeamPositionBalance(teamB).가드}명 | 
                            포워드: {getTeamPositionBalance(teamB).포워드}명 | 
                            센터: {getTeamPositionBalance(teamB).센터}명
                            {getTeamPositionBalance(teamB).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamB).기타}명`}
                          </small>
                        )}
                      </div>
                      <div className="card-body">
                        {teamB.map((member, index) => (
                          <div key={index} className="mb-2 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center flex-grow-1">
                              <div className="btn-group-vertical btn-group-sm me-2">
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayerInTeam('B', index, 'up');
                                  }}
                                  disabled={index === 0}
                                  title="위로 이동"
                                >
                                  ▲
                                </button>
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayerInTeam('B', index, 'down');
                                  }}
                                  disabled={index === teamB.length - 1}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-primary me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {(member.position || member.detailPosition) && (
                                  <small className="text-muted">
                                    {member.position && <span className="badge bg-info me-1">{member.position}</span>}
                                    {member.detailPosition && <span className="badge bg-secondary">{member.detailPosition}</span>}
                                  </small>
                                )}
                              </div>
                            </div>
                            <div className="btn-group-vertical btn-group-sm">
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  movePlayer(member, 'B', 'A');
                                }}
                                title="A팀으로 이동"
                              >
                                {teamMode === 3 ? 'A' : '←'}
                              </button>
                              {teamMode === 3 && (
                                <button 
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'B', 'C');
                                  }}
                                  title="C팀으로 이동"
                                >
                                  C
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* C팀 (3팀 모드일 때만) */}
                  {teamMode === 3 && (
                    <div className="col mb-3">
                      <div className="card border-warning h-100">
                        <div className="card-header bg-warning text-dark">
                          <h6 className="mb-0">🟡 C팀 ({teamC.length}명)</h6>
                          {teamC.length > 0 && (
                            <small>
                              가드: {getTeamPositionBalance(teamC).가드}명 | 
                              포워드: {getTeamPositionBalance(teamC).포워드}명 | 
                              센터: {getTeamPositionBalance(teamC).센터}명
                              {getTeamPositionBalance(teamC).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamC).기타}명`}
                            </small>
                          )}
                        </div>
                        <div className="card-body">
                          {teamC.map((member, index) => (
                            <div key={index} className="mb-2 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center flex-grow-1">
                                <div className="btn-group-vertical btn-group-sm me-2">
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('C', index, 'up');
                                    }}
                                    disabled={index === 0}
                                    title="위로 이동"
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('C', index, 'down');
                                    }}
                                    disabled={index === teamC.length - 1}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <span className="badge bg-warning me-2">{index + 1}</span>
                                <div>
                                  <div className="fw-bold">{member.name || member}</div>
                                  {(member.position || member.detailPosition) && (
                                    <small className="text-muted">
                                      {member.position && <span className="badge bg-info me-1">{member.position}</span>}
                                      {member.detailPosition && <span className="badge bg-secondary">{member.detailPosition}</span>}
                                    </small>
                                  )}
                                </div>
                              </div>
                              <div className="btn-group-vertical btn-group-sm">
                                <button 
                                  className="btn btn-outline-success btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'C', 'A');
                                  }}
                                  title="A팀으로 이동"
                                >
                                  A
                                </button>
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'C', 'B');
                                  }}
                                  title="B팀으로 이동"
                                >
                                  B
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default TeamDivider;