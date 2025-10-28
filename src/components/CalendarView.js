import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, getDocs, onSnapshot, query, where, getDocs as getDocsQuery, deleteDoc, doc, updateDoc } from "firebase/firestore";

function CalendarView({ isAdmin = false }) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showEventActionModal, setShowEventActionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventColor, setEventColor] = useState("#007bff");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");

  // Firebase에서 이벤트를 실시간으로 가져오기
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (querySnapshot) => {
      const eventArr = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        eventArr.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          color: data.color || "#007bff",
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      // 날짜순으로 정렬
      eventArr.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(eventArr);
    });

    return () => unsubscribe();
  }, []);

  // 회원 목록 가져오기
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
          });
        });
        setMembers(memberArr);
      } catch (error) {
        // 회원 목록 가져오기 오류는 무시
      }
    };
    fetchMembers();
  }, []);

  // 참석 데이터 가져오기
  const fetchAttendanceData = async (eventId) => {
    try {
      const q = query(collection(db, "attendance"), where("eventId", "==", eventId));
      const querySnapshot = await getDocsQuery(q);
      const attendanceArr = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendanceArr.push({
          id: doc.id,
          eventId: data.eventId,
          memberName: data.memberName,
          status: data.status, // "참석" or "불참석"
          createdAt: data.createdAt
        });
      });
      setAttendanceData(attendanceArr);
    } catch (error) {
      // 참석 데이터 가져오기 오류는 무시
    }
  };


  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !selectedDate) {
      alert("모임명과 날짜를 모두 입력해주세요.");
      return;
    }

    // 중복 날짜 체크
    const isDuplicate = events.some(event => event.date === selectedDate);
    if (isDuplicate) {
      alert("해당 날짜에 이미 모임이 있습니다. 다른 날짜를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const eventData = {
        title: eventTitle.trim(),
        date: selectedDate,
        color: eventColor,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "events"), eventData);
      
      
      // 모달 닫기 및 입력 필드 초기화
      setShowCreateModal(false);
      setEventTitle("");
      setSelectedDate("");
      setEventColor("#007bff");
      
    } catch (error) {
      // 모임 생성 중 오류는 무시
      alert("모임 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 이벤트 클릭 핸들러
  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
    setShowEventActionModal(true);
  };

  // 참석 관리로 이동
  const handleAttendanceManagement = () => {
    fetchAttendanceData(selectedEvent.id);
    setShowEventActionModal(false);
    setShowAttendanceModal(true);
  };

  // 팀 나누기로 이동
  const handleTeamDivision = () => {
    const eventData = {
      id: selectedEvent.id,
      title: selectedEvent.title,
      date: selectedEvent.startStr
    };
    navigate('/teams', { state: { selectedEvent: eventData } });
  };

  // 매치 결과로 이동
  const handleMatchResult = () => {
    const eventData = {
      id: selectedEvent.id,
      title: selectedEvent.title,
      date: selectedEvent.startStr
    };
    navigate('/matchResult', { state: { selectedEvent: eventData } });
  };

  // 참석/불참석 선택
  const handleAttendanceSubmit = async (status, memberName = null) => {
    const targetMember = memberName || selectedMember;
    if (!selectedEvent || !targetMember) {
      alert("회원을 선택해주세요.");
      return;
    }

    // 이미 등록된 회원인지 확인
    const existingAttendance = attendanceData.find(
      attendance => attendance.memberName === targetMember
    );
    if (existingAttendance) {
      alert(`${targetMember}님은 이미 참석 등록되어 있습니다.`);
      return;
    }

    try {
      await addDoc(collection(db, "attendance"), {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.startStr,
        memberName: targetMember,
        status: status,
        createdAt: new Date().toISOString()
      });

      setSelectedMember(""); // 선택 초기화
      fetchAttendanceData(selectedEvent.id); // 목록 새로고침
    } catch (error) {
      // 참석 등록 중 오류는 무시
      alert("참석 등록 중 오류가 발생했습니다.");
    }
  };

  // 참석 기록 삭제
  const handleDeleteAttendance = async (attendanceId, memberName) => {
    try {
      await deleteDoc(doc(db, "attendance", attendanceId));
      fetchAttendanceData(selectedEvent.id); // 목록 새로고침
    } catch (error) {
      // 참석 기록 삭제 중 오류는 무시
      alert("참석 기록 삭제 중 오류가 발생했습니다.");
    }
  };

  //모임 삭제
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("이 모임을 삭제하시겠습니까?")) return;
  
    await deleteDoc(doc(db, "events", selectedEvent.id));
    // 관련 참석 데이터도 정리하려면 추가 조회 후 deleteDoc 반복
    setShowAttendanceModal(false);
    setSelectedEvent(null);
  };

  // 참석 상태 변경
  const handleToggleAttendanceStatus = async (attendanceId, memberName, currentStatus) => {
    const newStatus = currentStatus === "참석" ? "불참석" : "참석";

    try {
      await updateDoc(doc(db, "attendance", attendanceId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      fetchAttendanceData(selectedEvent.id); // 목록 새로고침
    } catch (error) {
      // 참석 상태 변경 중 오류는 무시
      alert("참석 상태 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">운동 일정 달력</h2>
      <div className="card shadow">
        <div className="card-body">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height={500}
            events={events}
            eventDisplay="block"
            eventTextColor="#fff"
            eventClick={handleEventClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
          />
        </div>
      </div>
      
      {/* 모임 생성 버튼 - 관리자만 표시 */}
      {isAdmin && (
        <div className="text-center mt-3">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setShowCreateModal(true);
              setSelectedDate("");
              setEventTitle("");
              setEventColor("#007bff");
            }}
          >
            📅 모임 생성
          </button>
        </div>
      )}

      {/* 모임 생성 모달 - 관리자만 표시 */}
      {showCreateModal && isAdmin && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📅 모임 생성</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedDate("");
                    setEventTitle("");
                    setEventColor("#007bff");
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="eventDate" className="form-label">날짜 선택</label>
                  <input
                    type="date"
                    className="form-control"
                    id="eventDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="eventTitle" className="form-label">모임명</label>
                <input
                  type="text"
                  className="form-control"
                    id="eventTitle"
                    placeholder="모임명을 입력하세요"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
                </div>
                <div className="mb-3">
                  <label htmlFor="eventColor" className="form-label">색상 선택</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      id="eventColor"
                      value={eventColor}
                      onChange={(e) => setEventColor(e.target.value)}
                      style={{ width: "60px", height: "40px" }}
                    />
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        backgroundColor: eventColor, 
                        color: "white", 
                        minWidth: "100px",
                        textAlign: "center",
                        fontWeight: "bold"
                      }}
                    >
                      미리보기
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedDate("");
                    setEventTitle("");
                    setEventColor("#007bff");
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateEvent}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      생성 중...
                    </>
                  ) : (
                    "모임 생성"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 참석/불참석 모달 */}
      {showAttendanceModal && selectedEvent && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📅 {selectedEvent.title} - 참석 관리</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedEvent(null);
                    setAttendanceData([]);
                    setSelectedMember("");
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p><strong>날짜:</strong> {selectedEvent.startStr}</p>
                </div>
                

                <div>
                  {/* 참석 인원 */}
                  <h6 className="text-success">✅ 참석 인원 ({attendanceData.filter(a => a.status === '참석').length}명)</h6>
                  {attendanceData.filter(a => a.status === '참석').length > 0 ? (
                    <div className="row mb-3">
                      {attendanceData.filter(a => a.status === '참석').map((attendance) => (
                        <div key={attendance.id} className="col-md-4 mb-2">
                          <div className="card border-success">
                            <div className="card-body p-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <strong className="me-2">{attendance.memberName}</strong>
                                </div>
                                <div className="d-flex align-items-center">
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteAttendance(attendance.id, attendance.memberName)}
                                    title="참석 기록 삭제"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-3">참석한 인원이 없습니다.</p>
                  )}

                  {/* 불참 인원 */}
                  <h6 className="text-danger">❌ 불참 인원 ({attendanceData.filter(a => a.status === '불참석').length}명)</h6>
                  {attendanceData.filter(a => a.status === '불참석').length > 0 ? (
                    <div className="row mb-3">
                      {attendanceData.filter(a => a.status === '불참석').map((attendance) => (
                        <div key={attendance.id} className="col-md-4 mb-2">
                          <div className="card border-danger">
                            <div className="card-body p-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <strong className="me-2">{attendance.memberName}</strong>
                                </div>
                                <div className="d-flex align-items-center">
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteAttendance(attendance.id, attendance.memberName)}
                                    title="참석 기록 삭제"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-3">불참한 인원이 없습니다.</p>
                  )}

                  {/* 미투표 인원 */}
                  <h6 className="text-warning">⏳ 미투표 인원 ({members.filter(m => !attendanceData.some(a => a.memberName === m.name)).length}명)</h6>
                  {members.filter(m => !attendanceData.some(a => a.memberName === m.name)).length > 0 ? (
                    <div className="row">
                      {members.filter(m => !attendanceData.some(a => a.memberName === m.name)).map((member) => (
                        <div key={member.nm} className="col-md-4 mb-2">
                          <div className="card border-warning">
                            <div className="card-body p-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <strong className="me-2">{member.name}</strong>
                                </div>
                                <div className="d-flex align-items-center">
                                  <button
                                    className="btn btn-sm btn-success me-1"
                                    onClick={() => handleAttendanceSubmit("참석", member.name)}
                                    title="참석으로 등록"
                                  >
                                    참석
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleAttendanceSubmit("불참석", member.name)}
                                    title="불참으로 등록"
                                  >
                                    불참
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">모든 회원이 투표했습니다.</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
              
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteEvent}
                >
                  모임 삭제
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedEvent(null);
                    setAttendanceData([]);
                    setSelectedMember("");
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이벤트 액션 선택 모달 */}
      {showEventActionModal && selectedEvent && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📅 {selectedEvent.title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowEventActionModal(false);
                    setSelectedEvent(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p><strong>날짜:</strong> {selectedEvent.startStr}</p>
                <p className="text-muted">이 모임에 대해 어떤 작업을 하시겠습니까?</p>
              </div>
              <div className="modal-footer d-flex justify-content-center gap-2">
                <button
                  className="btn btn-info"
                  onClick={handleAttendanceManagement}
                >
                  👥 참석 관리
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleTeamDivision}
                >
                  🏀 팀 나누기
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleMatchResult}
                >
                  📊 매치 결과
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;