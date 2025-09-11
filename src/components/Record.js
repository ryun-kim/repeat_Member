// src/components/Record.js
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title);

function Record() {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  useEffect(() => {
    const fetchRecords = async () => {
      const querySnapshot = await getDocs(collection(db, "records"));
      const userRecords = querySnapshot.docs.filter((doc) => doc.data().userId === auth.currentUser.uid);
      const winCount = userRecords.filter((doc) => doc.data().result === "win").length;
      const lossCount = userRecords.filter((doc) => doc.data().result === "loss").length;
      setWins(winCount);
      setLosses(lossCount);
    };
    fetchRecords();
  }, []);

  const handleResultSubmit = async (result) => {
    try {
      await addDoc(collection(db, "records"), {
        userId: auth.currentUser.uid,
        result,
        timestamp: new Date()
      });
      setWins(result === "win" ? wins + 1 : wins);
      setLosses(result === "loss" ? losses + 1 : losses);
    } catch (error) {
      console.error(error);
    }
  };

  const winRate = wins + losses > 0 ? (wins / (wins + losses) * 100).toFixed(2) : 0;

  const chartData = {
    labels: ["승", "패"],
    datasets: [{
      label: "전적",
      data: [wins, losses],
      backgroundColor: ["#36A2EB", "#FF6384"],
      borderColor: ["#36A2EB", "#FF6384"],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      title: {
        display: true,
        text: "개인 전적"
      }
    }
  };

  return (
    <div>
      <h2>전적</h2>
      <p>승: {wins}, 패: {losses}, 승률: {winRate}%</p>
      <button onClick={() => handleResultSubmit("win")}>승리 입력</button>
      <button onClick={() => handleResultSubmit("loss")}>패배 입력</button>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
export default Record;