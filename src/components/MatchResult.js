// src/components/MatchResult.js
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

function MatchResult() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamC, setTeamC] = useState([]);
  const [gameResults, setGameResults] = useState([]);
  const [currentGame, setCurrentGame] = useState(1);
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameScore, setGameScore] = useState({
    teamA: 0,
    teamB: 0,
    teamC: 0
  });
  const [selectedWinner, setSelectedWinner] = useState('');
  const [savedTeamConfig, setSavedTeamConfig] = useState(null);
  const [savedMatchResult, setSavedMatchResult] = useState(null);

  // 이벤트 목록 가져오기
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const q = query(collection(db, "events"));
        const querySnapshot = await getDocs(q);
        const eventsData = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            const eventDate = new Date(data.date);
            eventDate.setHours(0, 0, 0, 0);
            return {
              id: doc.id,
              ...data,
              isPast: eventDate < today // 지나간 모임인지 표시
            };
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        setEvents(eventsData);
      } catch (error) {
        // 이벤트 가져오기 오류는 무시
      }
    };

    fetchEvents();
  }, []);

  // 회원 목록 가져오기
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const membersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMembers(membersData);
      } catch (error) {
        // 회원 목록 가져오기 오류는 무시
      }
    };

    fetchMembers();
  }, []);

  // 달력에서 전달받은 이벤트 자동 선택
  useEffect(() => {
    if (location.state?.selectedEvent && events.length > 0) {
      const eventFromCalendar = events.find(event => event.id === location.state.selectedEvent.id);
      if (eventFromCalendar) {
        handleEventSelect(eventFromCalendar);
      }
    }
  }, [location.state?.selectedEvent, events]);

  // 컴포넌트 언마운트 시 location state 정리
  useEffect(() => {
    return () => {
      if (location.state?.selectedEvent) {
        window.history.replaceState({}, document.title);
      }
    };
  }, []);

  // 이벤트 선택 핸들러
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setTeamA([]);
    setTeamB([]);
    setTeamC([]);
    setGameResults([]);
    setCurrentGame(1);
    setSavedTeamConfig(null);
    setSavedMatchResult(null);
    loadSavedTeamConfig(event.id);
    loadSavedMatchResult(event.id);
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
      }
    } catch (error) {
      // 팀 구성 불러오기 오류는 무시
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
        setGameResults(result.gameResults || []);
      } else {
        setSavedMatchResult(null);
        setGameResults([]);
      }
    } catch (error) {
      // 매치 결과 불러오기 오류는 무시
    }
  };

  // 경기 결과 입력 모달 열기
  const openGameModal = (gameNumber) => {
    setCurrentGame(gameNumber);
    setGameScore({ teamA: 0, teamB: 0, teamC: 0 });
    setSelectedWinner('');
    setShowGameModal(true);
  };

  // 경기 결과 저장
  const handleGameResult = () => {
    // 0:0인 경우
    const isAllZero = gameScore.teamA === 0 && gameScore.teamB === 0 && gameScore.teamC === 0;
    
    if (isAllZero) {
      const newResult = {
        game: currentGame,
        teamA: gameScore.teamA,
        teamB: gameScore.teamB,
        teamC: gameScore.teamC,
        winner: '경기 없음'
      };
      
      const updatedResults = gameResults.filter(r => r.game !== currentGame);
      updatedResults.push(newResult);
      setGameResults(updatedResults.sort((a, b) => a.game - b.game));
      setShowGameModal(false);
      return;
    }

    // 점수에 따라 자동으로 승리팀 결정
    let autoWinner = getGameWinner();
    
    // 무승부인 경우에만 사용자 선택 사용
    if (autoWinner === '무승부') {
      if (!selectedWinner) {
        alert('무승부인 경우 승리팀을 선택해주세요.');
        return;
      }
      autoWinner = selectedWinner;
    }

    const newResult = {
      game: currentGame,
      teamA: gameScore.teamA,
      teamB: gameScore.teamB,
      teamC: gameScore.teamC,
      winner: autoWinner
    };

    const updatedResults = gameResults.filter(r => r.game !== currentGame);
    updatedResults.push(newResult);
    setGameResults(updatedResults.sort((a, b) => a.game - b.game));
    setShowGameModal(false);
  };

  // 경기 승자 결정
  const getGameWinner = () => {
    if (savedTeamConfig?.teamMode === 3) {
      // 3팀 모드
      if (gameScore.teamA > gameScore.teamB && gameScore.teamA > gameScore.teamC) return 'A';
      if (gameScore.teamB > gameScore.teamA && gameScore.teamB > gameScore.teamC) return 'B';
      if (gameScore.teamC > gameScore.teamA && gameScore.teamC > gameScore.teamB) return 'C';
      return '무승부';
    } else {
      // 2팀 모드
      if (gameScore.teamA > gameScore.teamB) return 'A';
      if (gameScore.teamB > gameScore.teamA) return 'B';
      return '무승부';
    }
  };

  // 시리즈 승자 결정
  const getSeriesWinner = () => {
    const teamWins = { A: 0, B: 0, C: 0 };
    
    gameResults.forEach(result => {
      if (result.winner === 'A') teamWins.A++;
      else if (result.winner === 'B') teamWins.B++;
      else if (result.winner === 'C') teamWins.C++;
    });

    // 경기가 없는 경우
    if (teamWins.A === 0 && teamWins.B === 0 && teamWins.C === 0) {
      return '경기 없음';
    }

    if (savedTeamConfig?.teamMode === 3) {
      if (teamWins.A > teamWins.B && teamWins.A > teamWins.C) return 'A';
      if (teamWins.B > teamWins.A && teamWins.B > teamWins.C) return 'B';
      if (teamWins.C > teamWins.A && teamWins.C > teamWins.B) return 'C';
    } else {
      if (teamWins.A > teamWins.B) return 'A';
      if (teamWins.B > teamWins.A) return 'B';
    }
    
    return '무승부';
  };

  // 매치 결과 저장
  const saveMatchResult = async () => {
    if (gameResults.length === 0) {
      alert('경기 결과를 입력해주세요.');
      return;
    }

    const seriesWinner = getSeriesWinner();
    if (seriesWinner === '무승부' || seriesWinner === '경기 없음') {
      alert('시리즈 승자가 결정되지 않았습니다.');
      return;
    }

    try {
      const teamWins = { A: 0, B: 0, C: 0 };
      gameResults.forEach(result => {
        if (result.winner === 'A') teamWins.A++;
        else if (result.winner === 'B') teamWins.B++;
        else if (result.winner === 'C') teamWins.C++;
      });

      // 각 팀의 선수들 통계 업데이트
      const updatePromises = [];

      // A팀 선수들
      teamA.forEach(player => {
        const member = members.find(m => m.name === player.name);
        if (member) {
          const newWins = (member.wins || 0) + teamWins.A;
          const newLosses = (member.losses || 0) + (gameResults.length - teamWins.A);
          const newWinningSeries = (member.winningSeries || 0) + (seriesWinner === 'A' ? 1 : 0);
          
          // 최근 5경기 기록 업데이트
          const recentGames = member.recentGames || [];
          const newRecentGames = [...recentGames];
          
          // 시리즈 승리 여부에 따라 W 또는 L 추가
          if (seriesWinner === 'A') {
            newRecentGames.unshift('W');
          } else {
            newRecentGames.unshift('L');
          }
          
          // 최근 5경기만 유지
          const updatedRecentGames = newRecentGames.slice(0, 5);
          
          updatePromises.push(
            updateDoc(doc(db, "users", member.id), {
              wins: newWins,
              losses: newLosses,
              winningSeries: newWinningSeries,
              recentGames: updatedRecentGames
            })
          );
        }
      });

      // B팀 선수들
      teamB.forEach(player => {
        const member = members.find(m => m.name === player.name);
        if (member) {
          const newWins = (member.wins || 0) + teamWins.B;
          const newLosses = (member.losses || 0) + (gameResults.length - teamWins.B);
          const newWinningSeries = (member.winningSeries || 0) + (seriesWinner === 'B' ? 1 : 0);
          
          // 최근 5경기 기록 업데이트
          const recentGames = member.recentGames || [];
          const newRecentGames = [...recentGames];
          
          // 시리즈 승리 여부에 따라 W 또는 L 추가
          if (seriesWinner === 'B') {
            newRecentGames.unshift('W');
          } else {
            newRecentGames.unshift('L');
          }
          
          // 최근 5경기만 유지
          const updatedRecentGames = newRecentGames.slice(0, 5);
          
          updatePromises.push(
            updateDoc(doc(db, "users", member.id), {
              wins: newWins,
              losses: newLosses,
              winningSeries: newWinningSeries,
              recentGames: updatedRecentGames
            })
          );
        }
      });

      // C팀 선수들 (3팀 모드인 경우)
      if (savedTeamConfig?.teamMode === 3) {
        teamC.forEach(player => {
          const member = members.find(m => m.name === player.name);
          if (member) {
            const newWins = (member.wins || 0) + teamWins.C;
            const newLosses = (member.losses || 0) + (gameResults.length - teamWins.C);
            const newWinningSeries = (member.winningSeries || 0) + (seriesWinner === 'C' ? 1 : 0);
            
            // 최근 5경기 기록 업데이트
            const recentGames = member.recentGames || [];
            const newRecentGames = [...recentGames];
            
            // 시리즈 승리 여부에 따라 W 또는 L 추가
            if (seriesWinner === 'C') {
              newRecentGames.unshift('W');
            } else {
              newRecentGames.unshift('L');
            }
            
            // 최근 5경기만 유지
            const updatedRecentGames = newRecentGames.slice(0, 5);
            
            updatePromises.push(
              updateDoc(doc(db, "users", member.id), {
                wins: newWins,
                losses: newLosses,
                winningSeries: newWinningSeries,
                recentGames: updatedRecentGames
              })
            );
          }
        });
      }

      // 일정에 매치 결과 저장
      const matchResult = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        teamMode: savedTeamConfig?.teamMode || 2,
        teamA: teamA,
        teamB: teamB,
        teamC: teamC,
        gameResults: gameResults,
        seriesWinner: seriesWinner,
        createdAt: new Date()
      };

      updatePromises.push(
        addDoc(collection(db, "matchResults"), matchResult)
      );

      await Promise.all(updatePromises);
      setSavedMatchResult(matchResult);
      alert("매치 결과가 저장되었습니다!");
    } catch (error) {
      // 매치 결과 저장 오류는 무시
      alert("매치 결과 저장 중 오류가 발생했습니다.");
    }
  };

  // 팀 렌더링
  const renderTeam = (team, teamName, teamColor) => (
    <div className="col-md-4">
      <div className="card">
        <div className={`card-header bg-${teamColor} text-white`}>
          <h5 className="mb-0">{teamName}팀 ({team.length}명)</h5>
        </div>
        <div className="card-body">
          {team.length > 0 ? (
            <div className="list-group list-group-flush">
              {team.map((player, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{player.name}</strong>
                    {player.position && (
                      <small className="text-muted ms-2">({player.position})</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">선수가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-4">매치 결과</h2>
      
      {/* 모임 선택 */}
      <div className="row mb-4">
        <div className="col-md-6">
          <label className="form-label">모임 선택</label>
          <select 
            className="form-select"
            value={selectedEvent?.id || ''}
            onChange={(e) => {
              const event = events.find(evt => evt.id === e.target.value);
              if (event) handleEventSelect(event);
            }}
          >
            <option value="">모임을 선택하세요</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} ({new Date(event.date).toLocaleDateString()}){event.isPast ? ' - 지난 모임' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 팀 구성 표시 */}
      {selectedEvent && savedTeamConfig && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>팀 구성</h4>
              {!savedMatchResult && (
                <button 
                  className="btn btn-success"
                  onClick={saveMatchResult}
                >
                  매치 결과 저장
                </button>
              )}
            </div>
            <div className="row">
              {renderTeam(teamA, "A", "success")}
              {renderTeam(teamB, "B", "primary")}
              {savedTeamConfig.teamMode === 3 && renderTeam(teamC, "C", "warning")}
            </div>
          </div>
        </div>
      )}

      {/* 저장된 매치 결과 표시 */}
      {selectedEvent && savedMatchResult && (
        <div className="row mb-4">
          <div className="col-12">
            <h4>저장된 매치 결과</h4>
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">{savedMatchResult.eventTitle} - {new Date(savedMatchResult.eventDate).toLocaleDateString()}</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {savedMatchResult.gameResults.map((result, index) => (
                    <div key={index} className="col-md-2 mb-2">
                      <div className="card text-center">
                        <div className="card-body p-2">
                          <h6 className="card-title">{result.game}경기</h6>
                          <div className="small">
                            <div>A팀: {result.teamA}점</div>
                            <div>B팀: {result.teamB}점</div>
                            {savedMatchResult.teamMode === 3 && <div>C팀: {result.teamC}점</div>}
                            <div className="mt-1">
                              <span className={`badge ${
                                result.winner === 'A' ? 'bg-success' :
                                result.winner === 'B' ? 'bg-primary' :
                                result.winner === 'C' ? 'bg-warning' : 'bg-secondary'
                              }`}>
                                {result.winner === 'A' ? 'A팀 승' :
                                 result.winner === 'B' ? 'B팀 승' :
                                 result.winner === 'C' ? 'C팀 승' : result.winner}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-3">
                  <h5>
                    시리즈 승자: 
                    <span className={`ms-2 ${
                      savedMatchResult.seriesWinner === 'A' ? 'text-success' :
                      savedMatchResult.seriesWinner === 'B' ? 'text-primary' :
                      savedMatchResult.seriesWinner === 'C' ? 'text-warning' : 'text-muted'
                    }`}>
                      {savedMatchResult.seriesWinner === 'A' ? 'A팀' :
                       savedMatchResult.seriesWinner === 'B' ? 'B팀' :
                       savedMatchResult.seriesWinner === 'C' ? 'C팀' : savedMatchResult.seriesWinner}
                    </span>
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 경기 결과 입력 */}
      {selectedEvent && savedTeamConfig && !savedMatchResult && (
        <div className="row mb-4">
          <div className="col-12">
            <h4>경기 결과 입력</h4>
            <div className="row">
              {[1, 2, 3, 4].map(gameNum => {
                const existingResult = gameResults.find(r => r.game === gameNum);
                return (
                  <div key={gameNum} className="col-md-2 mb-2">
                    <button
                      className={`btn w-100 ${
                        existingResult 
                          ? existingResult.winner === 'A' ? 'btn-success' :
                            existingResult.winner === 'B' ? 'btn-primary' :
                            existingResult.winner === 'C' ? 'btn-warning' :
                            'btn-secondary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => openGameModal(gameNum)}
                    >
                      {gameNum}경기
                      {existingResult && (
                        <div className="small">
                          {existingResult.winner === 'A' ? 'A팀 승' : 
                           existingResult.winner === 'B' ? 'B팀 승' : 
                           existingResult.winner === 'C' ? 'C팀 승' : existingResult.winner}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 시리즈 결과 */}
      {selectedEvent && savedTeamConfig && !savedMatchResult && gameResults.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">시리즈 결과</h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-4">
                    <h6>A팀</h6>
                    <h4 className="text-success">
                      {gameResults.filter(r => r.winner === 'A').length}승
                    </h4>
                  </div>
                  <div className="col-md-4">
                    <h6>B팀</h6>
                    <h4 className="text-primary">
                      {gameResults.filter(r => r.winner === 'B').length}승
                    </h4>
                  </div>
                  {savedTeamConfig.teamMode === 3 && (
                    <div className="col-md-4">
                      <h6>C팀</h6>
                      <h4 className="text-warning">
                        {gameResults.filter(r => r.winner === 'C').length}승
                      </h4>
                    </div>
                  )}
                </div>
                <div className="text-center mt-3">
                  <h5>
                    시리즈 승자: 
                    <span className={`ms-2 ${
                      getSeriesWinner() === 'A' ? 'text-success' :
                      getSeriesWinner() === 'B' ? 'text-primary' :
                      getSeriesWinner() === 'C' ? 'text-warning' : 'text-muted'
                    }`}>
                      {getSeriesWinner() === 'A' ? 'A팀' :
                       getSeriesWinner() === 'B' ? 'B팀' :
                       getSeriesWinner() === 'C' ? 'C팀' : 
                       getSeriesWinner() === '경기 없음' ? '경기 없음' : '무승부'}
                    </span>
                  </h5>
                  <button 
                    className="btn btn-primary mt-2"
                    onClick={saveMatchResult}
                  >
                    매치 결과 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 경기 결과 입력 모달 */}
      {showGameModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{currentGame}경기 점수 입력</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowGameModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4">
                    <label className="form-label">A팀 점수</label>
                    <input
                      type="number"
                      className="form-control"
                      value={gameScore.teamA}
                      onChange={(e) => setGameScore({...gameScore, teamA: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">B팀 점수</label>
                    <input
                      type="number"
                      className="form-control"
                      value={gameScore.teamB}
                      onChange={(e) => setGameScore({...gameScore, teamB: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  {savedTeamConfig?.teamMode === 3 && (
                    <div className="col-md-4">
                      <label className="form-label">C팀 점수</label>
                      <input
                        type="number"
                        className="form-control"
                        value={gameScore.teamC}
                        onChange={(e) => setGameScore({...gameScore, teamC: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  )}
                </div>
                
                {/* 승리팀 표시/선택 */}
                {!(gameScore.teamA === 0 && gameScore.teamB === 0 && gameScore.teamC === 0) && (
                  <div className="row mt-3">
                    <div className="col-12">
                      {getGameWinner() === '무승부' ? (
                        <>
                          <label className="form-label">승리팀 선택</label>
                          <select 
                            className="form-select"
                            value={selectedWinner}
                            onChange={(e) => setSelectedWinner(e.target.value)}
                          >
                            <option value="">승리팀을 선택하세요</option>
                            <option value="A">A팀 승리</option>
                            <option value="B">B팀 승리</option>
                            {savedTeamConfig?.teamMode === 3 && (
                              <option value="C">C팀 승리</option>
                            )}
                          </select>
                          <div className="alert alert-warning mt-2 mb-0">
                            <small><strong>무승부입니다!</strong> 위에서 승리팀을 선택해주세요.</small>
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="form-label">승리팀</label>
                          <div className="form-control-plaintext">
                            <span className={`badge ${
                              getGameWinner() === 'A' ? 'bg-success' :
                              getGameWinner() === 'B' ? 'bg-primary' :
                              getGameWinner() === 'C' ? 'bg-warning' : 'bg-secondary'
                            }`}>
                              {getGameWinner() === 'A' ? 'A팀 승리' :
                               getGameWinner() === 'B' ? 'B팀 승리' :
                               getGameWinner() === 'C' ? 'C팀 승리' : getGameWinner()}
                            </span>
                            <small className="text-muted ms-2">(점수에 따라 자동 결정)</small>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowGameModal(false)}
                >
                  취소
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleGameResult}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchResult;