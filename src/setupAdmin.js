// 관리자 계정 설정 스크립트
import { db } from "./firebase";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";

// 관리자 계정 초기 설정
export const setupAdminAccount = async () => {
  try {
    const adminRef = doc(db, "admins", "ryun");
    const adminSnap = await getDoc(adminRef);
    
    if (!adminSnap.exists()) {
      // 관리자 계정이 없으면 생성
      await setDoc(adminRef, {
        username: "ryun",
        password: "6260kjr!", // 실제 서비스에서는 해시화된 비밀번호 사용 권장
        role: "admin",
        createdAt: new Date(),
        lastLogin: null
      });
      console.log("관리자 계정이 생성되었습니다.");
    } else {
      console.log("관리자 계정이 이미 존재합니다.");
    }
  } catch (error) {
    console.error("관리자 계정 설정 중 오류:", error);
  }
};

// 관리자 인증 함수
export const authenticateAdmin = async (username, password) => {
  try {
    const adminRef = doc(db, "admins", username);
    const adminSnap = await getDoc(adminRef);
    
    if (!adminSnap.exists()) {
      return { success: false, message: "존재하지 않는 관리자입니다." };
    }
    
    const adminData = adminSnap.data();
    if (adminData.password !== password) {
      return { success: false, message: "비밀번호가 올바르지 않습니다." };
    }
    
    // 로그인 시간 업데이트
    await setDoc(adminRef, {
      ...adminData,
      lastLogin: new Date()
    }, { merge: true });
    
    return { 
      success: true, 
      message: "로그인 성공", 
      adminData: {
        username: adminData.username,
        role: adminData.role,
        lastLogin: adminData.lastLogin
      }
    };
  } catch (error) {
    console.error("관리자 인증 중 오류:", error);
    return { success: false, message: "인증 중 오류가 발생했습니다." };
  }
};

// 새로운 관리자 추가 함수
export const addAdmin = async (username, password, role = "admin") => {
  try {
    const adminRef = doc(db, "admins", username);
    const adminSnap = await getDoc(adminRef);
    
    if (adminSnap.exists()) {
      return { success: false, message: "이미 존재하는 관리자입니다." };
    }
    
    await setDoc(adminRef, {
      username,
      password, // 실제 서비스에서는 해시화된 비밀번호 사용 권장
      role,
      createdAt: new Date(),
      lastLogin: null
    });
    
    return { success: true, message: "관리자가 추가되었습니다." };
  } catch (error) {
    console.error("관리자 추가 중 오류:", error);
    return { success: false, message: "관리자 추가 중 오류가 발생했습니다." };
  }
};

// 관리자 목록 조회 함수
export const getAdminList = async () => {
  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const adminsRef = collection(db, "admins");
    const snapshot = await getDocs(adminsRef);
    
    const adminList = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      adminList.push({
        id: doc.id,
        username: data.username,
        role: data.role,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin
      });
    });
    
    return { success: true, adminList };
  } catch (error) {
    console.error("관리자 목록 조회 중 오류:", error);
    return { success: false, message: "관리자 목록 조회 중 오류가 발생했습니다." };
  }
};
