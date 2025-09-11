import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { db } from "../firebase";
import { collection, addDoc, getDocs, onSnapshot, query, where, getDocs as getDocsQuery, deleteDoc, doc, updateDoc } from "firebase/firestore";

function CalendarView({ isAdmin = false }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
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
        console.error("회원 목록 가져오기 오류:", error);
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
      console.error("참석 데이터 가져오기 오류:", error);
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
      
      // 성공 메시지
      alert(`"${eventTitle}" 모임이 ${selectedDate}에 성공적으로 생성되었습니다!`);
      
      // 모달 닫기 및 입력 필드 초기화
      setShowCreateModal(false);
      setEventTitle("");
      setSelectedDate("");
      setEventColor("#007bff");
      
    } catch (error) {
      console.error("모임 생성 중 오류가 발생했습니다:", error);
      alert("모임 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 이벤트 클릭 핸들러
  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
    fetchAttendanceData(info.event.id);
    setShowAttendanceModal(true);
  };

  // 참석/불참석 선택
  const handleAttendanceSubmit = async (status) => {
    if (!selectedEvent || !selectedMember) {
      alert("회원을 선택해주세요.");
      return;
    }

    // 이미 등록된 회원인지 확인
    const existingAttendance = attendanceData.find(
      attendance => attendance.memberName === selectedMember
    );
    if (existingAttendance) {
      alert(`${selectedMember}님은 이미 참석 등록되어 있습니다.`);
      return;
    }

    try {
      await addDoc(collection(db, "attendance"), {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.startStr,
        memberName: selectedMember,
        status: status,
        createdAt: new Date().toISOString()
      });

      setSelectedMember(""); // 선택 초기화
      fetchAttendanceData(selectedEvent.id); // 목록 새로고침
    } catch (error) {
      console.error("참석 등록 중 오류:", error);
      alert("참석 등록 중 오류가 발생했습니다.");
    }
  };

  // 참석 기록 삭제
  const handleDeleteAttendance = async (attendanceId, memberName) => {
    if (!window.confirm(`${memberName}님의 참석 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "attendance", attendanceId));
      fetchAttendanceData(selectedEvent.id); // 목록 새로고침
    } catch (error) {
      console.error("참석 기록 삭제 중 오류:", error);
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
      console.error("참석 상태 변경 중 오류:", error);
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
                
                <div className="mb-4">
                  
                  <div className="mb-3">
                    <label className="form-label">회원 선택</label>
                    <select
                      className="form-select"
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                    >
                      <option value="">회원을 선택하세요</option>
                      {members.map((member) => (
                        <option key={member.nm} value={member.name}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success"
                      onClick={() => handleAttendanceSubmit("참석")}
                      disabled={!selectedMember}
                    >
                      ✅ 참석
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleAttendanceSubmit("불참석")}
                      disabled={!selectedMember}
                    >
                      ❌ 불참석
                    </button>
                  </div>
                </div>

                <div>
                  <h6>참석 현황</h6>
                  {attendanceData.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th>상태</th>
                            <th>등록일</th>
                            <th>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.map((attendance) => (
                            <tr key={attendance.id}>
                              <td>{attendance.memberName}</td>
                              <td>
                                <span 
                                  className={`badge ${attendance.status === '참석' ? 'bg-success' : 'bg-danger'}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleToggleAttendanceStatus(attendance.id, attendance.memberName, attendance.status)}
                                  title="클릭하여 상태 변경"
                                >
                                  {attendance.status}
                                </span>
                              </td>
                              <td>{new Date(attendance.createdAt).toLocaleDateString()}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteAttendance(attendance.id, attendance.memberName)}
                                  title="참석 기록 삭제"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted">아직 참석 등록이 없습니다.</p>
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
    </div>
  );
}

export default CalendarView;