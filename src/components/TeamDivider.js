// src/components/TeamDivider.js
import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query, where, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import html2canvas from "html2canvas";
import "bootstrap/dist/css/bootstrap.min.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

function TeamDivider({ isAdmin }) {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamC, setTeamC] = useState([]);
  const [teamD, setTeamD] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamMode, setTeamMode] = useState(2); // 2팀, 3팀, 또는 4팀 모드
  const [savedTeamConfig, setSavedTeamConfig] = useState(null);
  const [savedMatchResult, setSavedMatchResult] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const teamConfigRef = useRef(null);
  const teamARef = useRef(null);
  const teamBRef = useRef(null);
  const teamCRef = useRef(null);
  const teamDRef = useRef(null);
  const [excludedPlayers, setExcludedPlayers] = useState([]);

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
          
          // 한 달 전부터 한 달 후까지의 모임만 포함
          const oneMonthAgo = new Date(today);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const oneMonthFromNow = new Date(today);
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
          
          
            eventList.push({
              id: doc.id,
              title: data.title,
              date: data.date,
              color: data.color || "#007bff",
              isPast: eventDate < today // 지나간 모임인지 표시
            });
          
        });
        // 날짜순으로 정렬
        eventList.sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(eventList);
      } catch (error) {
        // 이벤트 목록 가져오기 오류는 무시
      }
    };
    fetchEvents();
  }, []);

  // 달력용 이벤트 데이터 변환
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    color: event.color,
    isPast: event.isPast,
    className: selectedEvent?.id === event.id ? 'selected-event' : ''
  }));

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
          // 참석 데이터 가져오기 오류는 무시
        }
      };
      fetchAttendance();
    }
  }, [selectedEvent]);

  // 포지션 색깔 함수들
  const getPositionColor = (position) => {
    switch (position) {
      case "가드": return "bg-success";
      case "포워드": return "bg-primary";
      case "센터": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  const getDetailPositionColor = (detailPosition) => {
    switch (detailPosition) {
      case "PG": return "bg-success";
      case "SG": return "bg-warning";
      case "SF": return "bg-primary";
      case "PF": return "bg-purple";
      case "C": return "bg-danger";
      default: return "bg-secondary";
    }
  };

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
      setTeamD([]);
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
    let teamA = [];
    let teamB = [];
    let teamC = [];
    let teamD = [];

    Object.keys(positionGroups).forEach(position => {
      const players = positionGroups[position];
      if (players.length === 0) return;

      const shuffled = shuffleArray([...players]);
      
      if (teamMode === 2) {
        // 2팀 모드
        const midPoint = Math.ceil(shuffled.length / 2);
        teamA.push(...shuffled.slice(0, midPoint));
        teamB.push(...shuffled.slice(midPoint));
      } else if (teamMode === 3) {
        // 3팀 모드
        const thirdPoint = Math.ceil(shuffled.length / 3);
        const twoThirdPoint = Math.ceil(shuffled.length * 2 / 3);
        
        teamA.push(...shuffled.slice(0, thirdPoint));
        teamB.push(...shuffled.slice(thirdPoint, twoThirdPoint));
        teamC.push(...shuffled.slice(twoThirdPoint));
      } else {
        // 4팀 모드
        const quarterPoint = Math.ceil(shuffled.length / 4);
        const halfPoint = Math.ceil(shuffled.length / 2);
        const threeQuarterPoint = Math.ceil(shuffled.length * 3 / 4);
        
        teamA.push(...shuffled.slice(0, quarterPoint));
        teamB.push(...shuffled.slice(quarterPoint, halfPoint));
        teamC.push(...shuffled.slice(halfPoint, threeQuarterPoint));
        teamD.push(...shuffled.slice(threeQuarterPoint));
      }
    });

    // 팀 인원 균형 조정 (각 포지션별 고르게 분산 후 전체 인원만 조정)
    // 2팀 모드 균형 조정
    if (teamMode === 2) {
      while (Math.abs(teamA.length - teamB.length) > 1) {
        // 랜덤하게 선택된 팀에서 이동
        const teams = [teamA, teamB];
        if (teamA.length > teamB.length) {
          const randomIndex = Math.floor(Math.random() * teamA.length);
          const movedPlayer = teamA.splice(randomIndex, 1)[0];
          teamB.push(movedPlayer);
        } else {
          const randomIndex = Math.floor(Math.random() * teamB.length);
          const movedPlayer = teamB.splice(randomIndex, 1)[0];
          teamA.push(movedPlayer);
        }
      }
    } else if (teamMode === 3) {
      // 3팀 모드 균형 조정
      while (Math.abs(teamA.length - teamB.length) > 1 || 
             Math.abs(teamA.length - teamC.length) > 1 || 
             Math.abs(teamB.length - teamC.length) > 1) {
        const teams = [teamA, teamB, teamC];
        const lengths = teams.map(team => team.length);
        const maxIndex = lengths.indexOf(Math.max(...lengths));
        const minIndex = lengths.indexOf(Math.min(...lengths));
        
        const movedPlayer = teams[maxIndex].splice(
          Math.floor(Math.random() * teams[maxIndex].length), 
          1
        )[0];
        teams[minIndex].push(movedPlayer);
      }
    } else {
      // 4팀 모드 균형 조정
      while (true) {
        const teams = [teamA, teamB, teamC, teamD];
        const lengths = teams.map(team => team.length);
        const maxIndex = lengths.indexOf(Math.max(...lengths));
        const minIndex = lengths.indexOf(Math.min(...lengths));
        
        if (lengths[maxIndex] - lengths[minIndex] <= 1) break;
        
        const movedPlayer = teams[maxIndex].splice(
          Math.floor(Math.random() * teams[maxIndex].length), 
          1
        )[0];
        teams[minIndex].push(movedPlayer);
      }
    }

    // 최종적으로 섞기
    setTeamA(shuffleArray(teamA));
    setTeamB(shuffleArray(teamB));
    if (teamMode === 3 || teamMode === 4) {
      setTeamC(shuffleArray(teamC));
    } else {
      setTeamC([]);
    }
    if (teamMode === 4) {
      setTeamD(shuffleArray(teamD));
    } else {
      setTeamD([]);
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
        setTeamD(config.teamD || []);
        setTeamMode(config.teamMode || 2);
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
      }
    } catch (error) {
      // 매치 결과 불러오기 오류는 무시
    }
  };

  // 이벤트 선택 핸들러
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    // 팀나누기 결과 초기화
    setTeamA([]);
    setTeamB([]);
    setTeamC([]);
    setTeamD([]);
    setSavedTeamConfig(null);
    setSavedMatchResult(null);
    setExcludedPlayers([]);
    loadSavedTeamConfig(event.id);
    loadSavedMatchResult(event.id);
  };

  // 달력에서 이벤트 클릭 핸들러
  const handleCalendarEventClick = (info) => {
    const eventData = {
      id: info.event.id,
      title: info.event.title,
      date: info.event.startStr,
      color: info.event.color,
      isPast: new Date(info.event.startStr) < new Date()
    };
    handleEventSelect(eventData);
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
    const fromTeamState = fromTeam === 'A' ? teamA : fromTeam === 'B' ? teamB : fromTeam === 'C' ? teamC : teamD;
    const toTeamState = toTeam === 'A' ? teamA : toTeam === 'B' ? teamB : toTeam === 'C' ? teamC : teamD;
    
    const updatedFromTeam = fromTeamState.filter(p => p.name !== player.name);
    const updatedToTeam = [...toTeamState, player];
    
    if (fromTeam === 'A') setTeamA(updatedFromTeam);
    else if (fromTeam === 'B') setTeamB(updatedFromTeam);
    else if (fromTeam === 'C') setTeamC(updatedFromTeam);
    else setTeamD(updatedFromTeam);
    
    if (toTeam === 'A') setTeamA(updatedToTeam);
    else if (toTeam === 'B') setTeamB(updatedToTeam);
    else if (toTeam === 'C') setTeamC(updatedToTeam);
    else setTeamD(updatedToTeam);
  };

  // 선수 제외 함수
  const excludePlayer = (player, fromTeam) => {
    const fromTeamState = fromTeam === 'A' ? teamA : fromTeam === 'B' ? teamB : fromTeam === 'C' ? teamC : teamD;
    const updatedFromTeam = fromTeamState.filter(p => p.name !== player.name);
    
    if (fromTeam === 'A') setTeamA(updatedFromTeam);
    else if (fromTeam === 'B') setTeamB(updatedFromTeam);
    else if (fromTeam === 'C') setTeamC(updatedFromTeam);
    else setTeamD(updatedFromTeam);
    
    setExcludedPlayers([...excludedPlayers, player]);
  };

  // 제외된 선수 복원 함수
  const restorePlayer = (player) => {
    // 제외 목록에서 제거
    setExcludedPlayers(excludedPlayers.filter(p => p.name !== player.name));
    
    // 기본적으로 가장 적은 팀에 추가
    const teamAcount = teamA.length;
    const teamBcount = teamB.length;
    const teamCcount = teamC.length;
    const teamDcount = teamD.length;
    
    if (teamAcount <= teamBcount && teamAcount <= teamCcount && teamAcount <= teamDcount) {
      setTeamA([...teamA, player]);
    } else if (teamBcount <= teamCcount && teamBcount <= teamDcount) {
      setTeamB([...teamB, player]);
    } else if (teamCcount <= teamDcount) {
      setTeamC([...teamC, player]);
    } else {
      setTeamD([...teamD, player]);
    }
  };

  // 팀별 섞기 함수
  const shuffleTeam = (team) => {
    if (team === 'A') setTeamA(shuffleArray([...teamA]));
    else if (team === 'B') setTeamB(shuffleArray([...teamB]));
    else if (team === 'C') setTeamC(shuffleArray([...teamC]));
    else if (team === 'D') setTeamD(shuffleArray([...teamD]));
  };

  // 전체 초기화
  const resetTeams = () => {
    setTeamA([]);
    setTeamB([]);
    setTeamC([]);
    setTeamD([]);
  };

  // 팀 구성 저장
  const saveTeamConfiguration = async () => {
    if (!selectedEvent || (teamA.length === 0 && teamB.length === 0 && teamC.length === 0 && teamD.length === 0)) {
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
        teamD: teamD,
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
      alert("팀 구성 저장 중 오류가 발생했습니다.");
    }
  };

  // 팀 내에서 선수 순서 변경
  const movePlayerInTeam = (team, playerIndex, direction) => {
    const teamState = team === 'A' ? teamA : team === 'B' ? teamB : team === 'C' ? teamC : teamD;
    const newTeam = [...teamState];
    
    if (direction === 'up' && playerIndex > 0) {
      [newTeam[playerIndex - 1], newTeam[playerIndex]] = [newTeam[playerIndex], newTeam[playerIndex - 1]];
    } else if (direction === 'down' && playerIndex < newTeam.length - 1) {
      [newTeam[playerIndex], newTeam[playerIndex + 1]] = [newTeam[playerIndex + 1], newTeam[playerIndex]];
    }
    
    if (team === 'A') setTeamA(newTeam);
    else if (team === 'B') setTeamB(newTeam);
    else if (team === 'C') setTeamC(newTeam);
    else setTeamD(newTeam);
  };

  // 팀 구성 사진 저장
  const captureTeamConfig = async () => {
    if (!teamConfigRef.current) {
      alert("저장할 팀 구성이 없습니다.");
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(teamConfigRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: teamConfigRef.current.scrollWidth,
        height: teamConfigRef.current.scrollHeight
      });

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL('image/png');
      
      // 파일명 생성
      const eventTitle = selectedEvent?.title || '팀구성';
      const eventDate = selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString('ko-KR').replace(/\./g, '') : '';
      const fileName = `${eventTitle}_${eventDate}_팀구성.png`;

      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.download = fileName;
      link.href = imgData;
      
      // 다운로드 실행
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("팀 구성이 이미지로 저장되었습니다!");
    } catch (error) {
      alert("이미지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsCapturing(false);
    }
  };

  // 개별 팀 사진 저장
  const captureIndividualTeam = async (teamName, teamRef) => {
    if (!teamRef.current) {
      alert("저장할 팀이 없습니다.");
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(teamRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: teamRef.current.scrollWidth,
        height: teamRef.current.scrollHeight
      });

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL('image/png');
      
      // 파일명 생성
      const eventTitle = selectedEvent?.title || '팀구성';
      const eventDate = selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString('ko-KR').replace(/\./g, '') : '';
      const fileName = `${eventTitle}_${eventDate}_${teamName}팀.png`;

      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.download = fileName;
      link.href = imgData;
      
      // 다운로드 실행
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`${teamName}팀이 이미지로 저장되었습니다!`);
    } catch (error) {
      alert("이미지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsCapturing(false);
    }
  };


  return (
    <div className="container mt-5">
      <style>
        {`
          .past-event {
            opacity: 0.7 !important;
            border: 2px dashed #6c757d !important;
          }
          .past-event .fc-event-title {
            text-decoration: line-through;
          }
          .calendar-container {
            border-radius: 8px;
            overflow: hidden;
          }
          .fc-event {
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .fc-event:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .selected-event {
            border: 3px solid #007bff !important;
            box-shadow: 0 0 10px rgba(0,123,255,0.5) !important;
            font-weight: bold !important;
          }
        `}
      </style>
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4 text-center">🏀 팀 나누기</h2>
          {/* 모임 선택 - 달력 */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">모임 선택</h5>
              <small className="text-muted">달력에서 모임을 클릭하여 선택하세요</small>
            </div>
            <div className="card-body">
              {events.length > 0 ? (
                <div className="calendar-container">
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height={500}
                    events={calendarEvents}
                    eventDisplay="block"
                    eventTextColor="#fff"
                    eventClick={handleCalendarEventClick}
                    headerToolbar={{
                      left: 'prev',
                      center: 'title',
                      right: 'next'
                    }}
                    dayMaxEvents={2}
                    moreLinkClick="popover"
                    eventClassNames={(arg) => {
                      const event = events.find(e => e.id === arg.event.id);
                      return event?.isPast ? 'past-event' : '';
                    }}
                  />
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
                      disabled={attendanceData.length === 0 || (selectedEvent?.isPast && !isAdmin)}
                    >
                      팀 나누기
                    </button>
                    <div className="btn-group" role="group">
                      <input type="radio" className="btn-check" name="teamMode" id="team2" 
                        checked={teamMode === 2} onChange={() => setTeamMode(2)} />
                      <label className="btn btn-outline-primary" htmlFor="team2">2팀 모드</label>
                      <input type="radio" className="btn-check" name="teamMode" id="team3"
                        checked={teamMode === 3} onChange={() => setTeamMode(3)} />  
                      <label className="btn btn-outline-primary" htmlFor="team3">3팀 모드</label>
                      <input type="radio" className="btn-check" name="teamMode" id="team4"
                        checked={teamMode === 4} onChange={() => setTeamMode(4)} />
                      <label className="btn btn-outline-primary" htmlFor="team4">4팀 모드</label>
                    </div>
                    <div className="btn-group" role="group">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => shuffleTeam('A')}
                        disabled={teamA.length === 0 || (selectedEvent?.isPast && !isAdmin)}
                        title="A팀 섞기">
                        A팀 섞기
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => shuffleTeam('B')}
                        disabled={teamB.length === 0 || (selectedEvent?.isPast && !isAdmin)}
                        title="B팀 섞기"
                      >
                        B팀 섞기
                      </button>
                      {(teamMode === 3 || teamMode === 4) && (
                        <button 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => shuffleTeam('C')}
                          disabled={teamC.length === 0 || (selectedEvent?.isPast && !isAdmin)}
                          title="C팀 섞기"
                        >
                          C팀 섞기
                        </button>
                      )}
                      {teamMode === 4 && (
                        <button 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => shuffleTeam('D')}
                          disabled={teamD.length === 0 || (selectedEvent?.isPast && !isAdmin)}
                          title="D팀 섞기"
                        >
                          D팀 섞기
                        </button>
                      )}
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={resetTeams}
                        disabled={(teamA.length === 0 && teamB.length === 0 && teamC.length === 0 && teamD.length === 0) || (selectedEvent?.isPast && !isAdmin)}
                        title="선수 목록 초기화"
                      >
                        초기화
                      </button>
                      <button 
                        className="btn btn-outline-success btn-sm"
                        onClick={saveTeamConfiguration}
                        disabled={(teamA.length === 0 && teamB.length === 0 && teamC.length === 0 && teamD.length === 0) || (selectedEvent?.isPast && !isAdmin)}
                        title="팀 구성 저장"
                      >
                        저장
                      </button>
                    </div>
                    {selectedEvent?.isPast && !isAdmin && (
                      <div className="alert alert-warning mt-2 mb-0 text-center">
                        <small>지난 모임은 팀 나누기 기능을 사용할 수 없습니다.</small>
                      </div>
                    )}
                    {selectedEvent?.isPast && isAdmin && (
                      <div className="alert alert-info mt-2 mb-0 text-center">
                        <small>관리자 권한으로 지난 모임의 팀 나누기가 가능합니다.</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 저장된 팀 구성 표시 */}
          {savedTeamConfig && (teamA.length > 0 || teamB.length > 0 || teamC.length > 0 || teamD.length > 0) && (
            <div className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">저장된 팀 구성</h5>
                  {savedMatchResult && (
                    <small className="text-muted">(매치 결과도 저장됨)</small>
                  )}
                </div>
                <button 
                  className="btn btn-outline-info btn-sm"
                  onClick={captureTeamConfig}
                  disabled={isCapturing}
                  title="팀 구성을 이미지로 저장"
                >
                  {isCapturing ? '📸 저장 중...' : '📸 사진 저장'}
                </button>
              </div>
              <div className="card-body" ref={savedTeamConfig ? teamConfigRef : null}>
                <div className={`row ${teamMode === 4 ? 'row-cols-1 row-cols-md-4' : teamMode === 3 ? 'row-cols-1 row-cols-md-3' : 'row-cols-1 row-cols-md-2'}`}>
                  {/* A팀 */}
                  <div className="col mb-3">
                    <div className="card border-success h-100" ref={teamARef}>
                      <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <div>
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
                        {teamA.length > 0 && (
                          <button 
                            className="btn btn-outline-light btn-sm"
                            onClick={() => captureIndividualTeam('A', teamARef)}
                            disabled={isCapturing}
                            title="A팀 선수구성 저장"
                          >
                            📸
                          </button>
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
                                  disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                  disabled={index === teamA.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-success me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {member.detailPosition ? (
                                  <small className="text-muted">
                                    <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                      {member.detailPosition}
                                    </span>
                                  </small>
                                ) : (
                                  <small className="text-muted">
                                    <span className="badge bg-secondary">-</span>
                                  </small>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="btn-group-vertical btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'A', 'B');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="B팀으로 이동"
                                >
                                  B팀
                                </button>
                                {(teamMode === 3 || teamMode === 4) && (
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'A', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                )}
                                {teamMode === 4 && (
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'A', 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="D팀으로 이동"
                                  >
                                    D
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    excludePlayer(member, 'A');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="선수 제외"
                                >
                                  제외
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* B팀 */}
                  <div className="col mb-3">
                    <div className="card border-primary h-100" ref={teamBRef}>
                      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div>
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
                        {teamB.length > 0 && (
                          <button 
                            className="btn btn-outline-light btn-sm"
                            onClick={() => captureIndividualTeam('B', teamBRef)}
                            disabled={isCapturing}
                            title="B팀 선수구성 저장"
                          >
                            📸
                          </button>
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
                                  disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                  disabled={index === teamB.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-primary me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {member.detailPosition ? (
                                  <small className="text-muted">
                                    <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                      {member.detailPosition}
                                    </span>
                                  </small>
                                ) : (
                                  <small className="text-muted">
                                    <span className="badge bg-secondary">-</span>
                                  </small>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="btn-group-vertical btn-group-sm">
                                <button 
                                  className="btn btn-outline-success btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'B', 'A');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="A팀으로 이동"
                                >
                                  A팀
                                </button>
                                {(teamMode === 3 || teamMode === 4) && (
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'B', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                )}
                                {teamMode === 4 && (
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'B', 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="D팀으로 이동"
                                  >
                                    D
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    excludePlayer(member, 'B');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="선수 제외"
                                >
                                  제외
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* C팀 (3팀 또는 4팀 모드) */}
                  {(teamMode === 3 || teamMode === 4) && (
                    <div className="col mb-3">
                      <div className="card border-warning h-100" ref={teamCRef}>
                        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                          <div>
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
                          {teamC.length > 0 && (
                            <button 
                              className="btn btn-outline-dark btn-sm"
                              onClick={() => captureIndividualTeam('C', teamCRef)}
                              disabled={isCapturing}
                              title="C팀만 저장"
                            >
                              📸
                            </button>
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
                                    disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                    disabled={index === teamC.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <span className="badge bg-warning me-2">{index + 1}</span>
                                <div>
                                  <div className="fw-bold">{member.name || member}</div>
                                  {member.detailPosition ? (
                                    <small className="text-muted">
                                      <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                        {member.detailPosition}
                                      </span>
                                    </small>
                                  ) : (
                                    <small className="text-muted">
                                      <span className="badge bg-secondary">-</span>
                                    </small>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="btn-group-vertical btn-group-sm">
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'C', 'A');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
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
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="B팀으로 이동"
                                  >
                                    B
                                  </button>
                                  {teamMode === 4 && (
                                    <button 
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        movePlayer(member, 'C', 'D');
                                      }}
                                      disabled={selectedEvent?.isPast && !isAdmin}
                                      title="D팀으로 이동"
                                    >
                                      D
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      excludePlayer(member, 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="선수 제외"
                                  >
                                    제외
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* D팀 (4팀 모드일 때만) */}
                  {teamMode === 4 && (
                    <div className="col mb-3">
                      <div className="card border-danger h-100" ref={teamDRef}>
                        <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">🔴 D팀 ({teamD.length}명)</h6>
                            {teamD.length > 0 && (
                              <small>
                                가드: {getTeamPositionBalance(teamD).가드}명 | 
                                포워드: {getTeamPositionBalance(teamD).포워드}명 | 
                                센터: {getTeamPositionBalance(teamD).센터}명
                                {getTeamPositionBalance(teamD).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamD).기타}명`}
                              </small>
                            )}
                          </div>
                          {teamD.length > 0 && (
                            <button 
                              className="btn btn-outline-light btn-sm"
                              onClick={() => captureIndividualTeam('D', teamDRef)}
                              disabled={isCapturing}
                              title="D팀만 저장"
                            >
                              📸
                            </button>
                          )}
                        </div>
                        <div className="card-body">
                          {teamD.map((member, index) => (
                            <div key={index} className="mb-2 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center flex-grow-1">
                                <div className="btn-group-vertical btn-group-sm me-2">
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('D', index, 'up');
                                    }}
                                    disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
                                    title="위로 이동"
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('D', index, 'down');
                                    }}
                                    disabled={index === teamD.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <span className="badge bg-danger me-2">{index + 1}</span>
                                <div>
                                  <div className="fw-bold">{member.name || member}</div>
                                  {member.detailPosition ? (
                                    <small className="text-muted">
                                      <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                        {member.detailPosition}
                                      </span>
                                    </small>
                                  ) : (
                                    <small className="text-muted">
                                      <span className="badge bg-secondary">-</span>
                                    </small>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="btn-group-vertical btn-group-sm">
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'A');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="A팀으로 이동"
                                  >
                                    A
                                  </button>
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'B');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="B팀으로 이동"
                                  >
                                    B
                                  </button>
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      excludePlayer(member, 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="선수 제외"
                                  >
                                    제외
                                  </button>
                                </div>
                              )}
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

          {/* 제외된 선수 목록 */}
          {isAdmin && excludedPlayers.length > 0 && (
            <div className="card mb-3 border-danger">
              <div className="card-header bg-danger text-white">
                <h6 className="mb-0">❌ 제외된 선수 ({excludedPlayers.length}명)</h6>
                <small>관리자만 제외된 선수를 다시 추가할 수 있습니다.</small>
              </div>
              <div className="card-body">
                <div className="row">
                  {excludedPlayers.map((player, index) => (
                    <div key={index} className="col-md-3 mb-2">
                      <div className="card border-danger">
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold">{player.name || player}</div>
                              {player.detailPosition && (
                                <small className="text-muted">
                                  <span className={`badge ${getDetailPositionColor(player.detailPosition)}`}>
                                    {player.detailPosition}
                                  </span>
                                </small>
                              )}
                            </div>
                            {isAdmin && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => restorePlayer(player)}
                                title="선수 복원"
                              >
                                복원
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 팀 나누기 결과 */}
          {!savedTeamConfig && (teamA.length > 0 || teamB.length > 0 || teamC.length > 0 || teamD.length > 0) && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">팀 나누기 결과</h5>
                <button 
                  className="btn btn-outline-info btn-sm"
                  onClick={captureTeamConfig}
                  disabled={isCapturing}
                  title="팀 구성을 이미지로 저장"
                >
                  {isCapturing ? '📸 저장 중...' : '📸 사진 저장'}
                </button>
              </div>
              <div className="card-body" ref={!savedTeamConfig ? teamConfigRef : null}>
                <div className={`row ${teamMode === 4 ? 'row-cols-1 row-cols-md-4' : teamMode === 3 ? 'row-cols-1 row-cols-md-3' : 'row-cols-1 row-cols-md-2'}`}>
                  {/* A팀 */}
                  <div className="col mb-3">
                    <div className="card border-success h-100" ref={!savedTeamConfig ? teamARef : null}>
                      <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <div>
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
                        {teamA.length > 0 && !savedTeamConfig && (
                          <button 
                            className="btn btn-outline-light btn-sm"
                            onClick={() => captureIndividualTeam('A', teamARef)}
                            disabled={isCapturing}
                            title="A팀만 저장"
                          >
                            📸
                          </button>
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
                                  disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                  disabled={index === teamA.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-success me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {member.detailPosition ? (
                                  <small className="text-muted">
                                    <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                      {member.detailPosition}
                                    </span>
                                  </small>
                                ) : (
                                  <small className="text-muted">
                                    <span className="badge bg-secondary">-</span>
                                  </small>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="btn-group-vertical btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'A', 'B');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="B팀으로 이동"
                                >
                                  B팀
                                </button>
                                {(teamMode === 3 || teamMode === 4) && (
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'A', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                )}
                                {teamMode === 4 && (
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'A', 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="D팀으로 이동"
                                  >
                                    D
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    excludePlayer(member, 'A');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="선수 제외"
                                >
                                  제외
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* B팀 */}
                  <div className="col mb-3">
                    <div className="card border-primary h-100" ref={!savedTeamConfig ? teamBRef : null}>
                      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <div>
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
                        {teamB.length > 0 && !savedTeamConfig && (
                          <button 
                            className="btn btn-outline-light btn-sm"
                            onClick={() => captureIndividualTeam('B', teamBRef)}
                            disabled={isCapturing}
                            title="B팀만 저장"
                          >
                            📸
                          </button>
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
                                  disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                  disabled={index === teamB.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>
                              <span className="badge bg-primary me-2">{index + 1}</span>
                              <div>
                                <div className="fw-bold">{member.name || member}</div>
                                {member.detailPosition ? (
                                  <small className="text-muted">
                                    <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                      {member.detailPosition}
                                    </span>
                                  </small>
                                ) : (
                                  <small className="text-muted">
                                    <span className="badge bg-secondary">-</span>
                                  </small>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="btn-group-vertical btn-group-sm">
                                <button 
                                  className="btn btn-outline-success btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePlayer(member, 'B', 'A');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="A팀으로 이동"
                                >
                                  A팀
                                </button>
                                {(teamMode === 3 || teamMode === 4) && (
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'B', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                )}
                                {teamMode === 4 && (
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'B', 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="D팀으로 이동"
                                  >
                                    D
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    excludePlayer(member, 'B');
                                  }}
                                  disabled={selectedEvent?.isPast && !isAdmin}
                                  title="선수 제외"
                                >
                                  제외
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* C팀 (3팀 또는 4팀 모드) */}
                  {(teamMode === 3 || teamMode === 4) && (
                    <div className="col mb-3">
                      <div className="card border-warning h-100" ref={!savedTeamConfig ? teamCRef : null}>
                        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                          <div>
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
                          {teamC.length > 0 && !savedTeamConfig && (
                            <button 
                              className="btn btn-outline-dark btn-sm"
                              onClick={() => captureIndividualTeam('C', teamCRef)}
                              disabled={isCapturing}
                              title="C팀만 저장"
                            >
                              📸
                            </button>
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
                                    disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
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
                                    disabled={index === teamC.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <span className="badge bg-warning me-2">{index + 1}</span>
                                <div>
                                  <div className="fw-bold">{member.name || member}</div>
                                  {member.detailPosition ? (
                                    <small className="text-muted">
                                      <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                        {member.detailPosition}
                                      </span>
                                    </small>
                                  ) : (
                                    <small className="text-muted">
                                      <span className="badge bg-secondary">-</span>
                                    </small>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="btn-group-vertical btn-group-sm">
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'C', 'A');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
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
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="B팀으로 이동"
                                  >
                                    B
                                  </button>
                                  {teamMode === 4 && (
                                    <button 
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        movePlayer(member, 'C', 'D');
                                      }}
                                      disabled={selectedEvent?.isPast && !isAdmin}
                                      title="D팀으로 이동"
                                    >
                                      D
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      excludePlayer(member, 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="선수 제외"
                                  >
                                    제외
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* D팀 (4팀 모드일 때만) */}
                  {teamMode === 4 && (
                    <div className="col mb-3">
                      <div className="card border-danger h-100" ref={!savedTeamConfig ? teamDRef : null}>
                        <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">🔴 D팀 ({teamD.length}명)</h6>
                            {teamD.length > 0 && (
                              <small>
                                가드: {getTeamPositionBalance(teamD).가드}명 | 
                                포워드: {getTeamPositionBalance(teamD).포워드}명 | 
                                센터: {getTeamPositionBalance(teamD).센터}명
                                {getTeamPositionBalance(teamD).기타 > 0 && ` | 기타: ${getTeamPositionBalance(teamD).기타}명`}
                              </small>
                            )}
                          </div>
                          {teamD.length > 0 && !savedTeamConfig && (
                            <button 
                              className="btn btn-outline-light btn-sm"
                              onClick={() => captureIndividualTeam('D', teamDRef)}
                              disabled={isCapturing}
                              title="D팀만 저장"
                            >
                              📸
                            </button>
                          )}
                        </div>
                        <div className="card-body">
                          {teamD.map((member, index) => (
                            <div key={index} className="mb-2 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center flex-grow-1">
                                <div className="btn-group-vertical btn-group-sm me-2">
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('D', index, 'up');
                                    }}
                                    disabled={index === 0 || (selectedEvent?.isPast && !isAdmin)}
                                    title="위로 이동"
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayerInTeam('D', index, 'down');
                                    }}
                                    disabled={index === teamD.length - 1 || (selectedEvent?.isPast && !isAdmin)}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                                <span className="badge bg-danger me-2">{index + 1}</span>
                                <div>
                                  <div className="fw-bold">{member.name || member}</div>
                                  {member.detailPosition ? (
                                    <small className="text-muted">
                                      <span className={`badge ${getDetailPositionColor(member.detailPosition)}`}>
                                        {member.detailPosition}
                                      </span>
                                    </small>
                                  ) : (
                                    <small className="text-muted">
                                      <span className="badge bg-secondary">-</span>
                                    </small>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="btn-group-vertical btn-group-sm">
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'A');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="A팀으로 이동"
                                  >
                                    A
                                  </button>
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'B');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="B팀으로 이동"
                                  >
                                    B
                                  </button>
                                  <button 
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      movePlayer(member, 'D', 'C');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="C팀으로 이동"
                                  >
                                    C
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      excludePlayer(member, 'D');
                                    }}
                                    disabled={selectedEvent?.isPast && !isAdmin}
                                    title="선수 제외"
                                  >
                                    제외
                                  </button>
                                </div>
                              )}
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