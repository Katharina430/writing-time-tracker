import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, BarChart3, CheckSquare, Square, Download, Upload, FileText } from 'lucide-react';
import './App.css';

const WritingTimeTracker = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkedSlots, setCheckedSlots] = useState({});
  const [viewMode, setViewMode] = useState('daily'); // daily, weekly, monthly
  const fileInputRef = useRef(null);

  // 시간 슬롯 생성 (30분 단위, 0시~24시 = 하루 전체)
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem('writingTimeData');
    if (saved) {
      setCheckedSlots(JSON.parse(saved));
    }
  }, []);

  // 데이터 저장
  useEffect(() => {
    localStorage.setItem('writingTimeData', JSON.stringify(checkedSlots));
  }, [checkedSlots]);

  const toggleSlot = (date, time) => {
    const key = `${date}_${time}`;
    setCheckedSlots(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSlotChecked = (date, time) => {
    return checkedSlots[`${date}_${time}`] || false;
  };

  const getTotalTimeForDate = (date) => {
    const total = timeSlots.reduce((acc, time) => {
      return acc + (isSlotChecked(date, time) ? 0.5 : 0);
    }, 0);
    return total;
  };

  const getWeekDates = (date) => {
    const d = new Date(date);
    const week = [];
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  };

  const getMonthDates = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(`${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`);
    }
    return dates;
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = (hours - h) * 60;
    if (h === 0) return `${m}분`;
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
  };

  const getDayName = (dateStr) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[new Date(dateStr).getDay()];
  };

  // CSV 내보내기 함수
  const exportToCSV = () => {
    // 모든 기록된 날짜 수집
    const allDates = new Set();
    Object.keys(checkedSlots).forEach(key => {
      if (checkedSlots[key]) {
        const date = key.split('_')[0];
        allDates.add(date);
      }
    });

    if (allDates.size === 0) {
      alert('내보낼 데이터가 없습니다!');
      return;
    }

    const sortedDates = Array.from(allDates).sort();
    
    // CSV 헤더
    let csvContent = '날짜,요일,총시간(시간),총시간(분),시간대별기록\n';
    
    // 각 날짜별 데이터
    sortedDates.forEach(date => {
      const dayName = getDayName(date);
      const totalTime = getTotalTimeForDate(date);
      const totalMinutes = Math.round(totalTime * 60);
      
      // 해당 날짜의 체크된 시간들
      const checkedTimes = timeSlots.filter(time => isSlotChecked(date, time));
      const timeRanges = checkedTimes.join(';');
      
      csvContent += `${date},${dayName},${totalTime},${totalMinutes},"${timeRanges}"\n`;
    });

    // 파일 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `집필기록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // CSV 가져오기 함수
  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const lines = csvContent.split('\n');
        const newCheckedSlots = { ...checkedSlots };
        
        // 헤더 제외하고 처리
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',');
          if (parts.length < 5) continue;
          
          const date = parts[0];
          const timeRanges = parts[4].replace(/"/g, ''); // 따옴표 제거
          
          if (timeRanges) {
            const times = timeRanges.split(';');
            times.forEach(time => {
              if (time.trim()) {
                newCheckedSlots[`${date}_${time.trim()}`] = true;
              }
            });
          }
        }
        
        setCheckedSlots(newCheckedSlots);
        alert('CSV 파일을 성공적으로 가져왔습니다!');
      } catch (error) {
        alert('CSV 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 파일 입력 초기화
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <CheckSquare className="text-blue-600" />
          집필 시간 체커
        </h1>
        <p className="text-gray-600">30분 단위로 집필 시간을 기록하고 패턴을 확인해보세요</p>
      </div>

      {/* 컨트롤 */}
      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'daily' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            일별
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'weekly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            주별
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'monthly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            월별
          </button>
        </div>
        
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* 백업/복원 버튼 */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={importFromCSV}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            CSV 가져오기
          </button>
        </div>
      </div>

      {/* 일별 뷰 */}
      {viewMode === 'daily' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDate} ({getDayName(selectedDate)})
            </h2>
            <div className="text-lg font-medium text-blue-600">
              총 {formatTime(getTotalTimeForDate(selectedDate))}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-4 text-sm mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                <span className="text-purple-600 font-medium">새벽 (00-06)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-blue-600 font-medium">오전 (06-12)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-green-600 font-medium">오후 (12-18)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                <span className="text-orange-600 font-medium">저녁 (18-24)</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {timeSlots.map((time) => {
              const hour = parseInt(time.split(':')[0]);
              const isEarlyMorning = hour >= 0 && hour < 6;
              const isMorning = hour >= 6 && hour < 12;
              const isAfternoon = hour >= 12 && hour < 18;
              const isEvening = hour >= 18 && hour < 24;
              
              let timeColor = '';
              if (isEarlyMorning) timeColor = 'text-purple-600';
              else if (isMorning) timeColor = 'text-blue-600';
              else if (isAfternoon) timeColor = 'text-green-600';
              else timeColor = 'text-orange-600';
              
              return (
                <div key={time} className="text-center">
                  <div className={`text-xs mb-1 font-medium ${timeColor}`}>{time}</div>
                  <button
                    onClick={() => toggleSlot(selectedDate, time)}
                    className={`w-full h-8 rounded border-2 transition-all duration-200 ${
                      isSlotChecked(selectedDate, time)
                        ? 'bg-blue-500 border-blue-600 text-white'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {isSlotChecked(selectedDate, time) ? (
                      <CheckSquare className="w-4 h-4 mx-auto" />
                    ) : (
                      <Square className="w-4 h-4 mx-auto text-gray-400" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 주별 뷰 */}
      {viewMode === 'weekly' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            주간 패턴
          </h2>
          
          <div className="grid grid-cols-7 gap-4">
            {getWeekDates(selectedDate).map((date) => {
              const totalTime = getTotalTimeForDate(date);
              const maxHeight = 120;
              const height = Math.max(8, (totalTime / 8) * maxHeight);
              
              return (
                <div key={date} className="text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {date.split('-')[2]}일<br />
                    ({getDayName(date)})
                  </div>
                  <div 
                    className="bg-blue-500 rounded-t mx-auto transition-all duration-300"
                    style={{ width: '24px', height: `${height}px` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2">
                    {formatTime(totalTime)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 월별 뷰 */}
      {viewMode === 'monthly' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            월간 패턴
          </h2>
          
          <div className="grid grid-cols-7 gap-2">
            <div className="text-center text-sm font-medium text-gray-600 py-2">일</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">월</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">화</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">수</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">목</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">금</div>
            <div className="text-center text-sm font-medium text-gray-600 py-2">토</div>
            
            {getMonthDates(selectedDate).map((date) => {
              const totalTime = getTotalTimeForDate(date);
              const dayOfWeek = new Date(date).getDay();
              const day = date.split('-')[2];
              
              // 월의 첫째 날 앞에 빈 칸 추가
              const emptySlots = [];
              if (day === '01') {
                for (let i = 0; i < dayOfWeek; i++) {
                  emptySlots.push(<div key={`empty-${i}`} className="p-2"></div>);
                }
              }
              
              const intensity = totalTime === 0 ? 0 : Math.min(4, Math.ceil(totalTime / 2));
              const colorClasses = [
                'bg-gray-100',
                'bg-blue-200',
                'bg-blue-400',
                'bg-blue-600',
                'bg-blue-800'
              ];
              
              return (
                <React.Fragment key={date}>
                  {emptySlots}
                  <button
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded text-sm transition-all duration-200 hover:scale-105 ${
                      colorClasses[intensity]
                    } ${intensity > 2 ? 'text-white' : 'text-gray-800'} ${
                      date === selectedDate ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    <div className="font-medium">{day}</div>
                    {totalTime > 0 && (
                      <div className="text-xs opacity-75">{totalTime}h</div>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>적음</span>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-3 h-3 rounded ${['bg-gray-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'][i]}`}></div>
            ))}
            <span>많음</span>
          </div>
        </div>
      )}

      {/* 통계 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">오늘</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(getTotalTimeForDate(new Date().toISOString().split('T')[0]))}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">이번 주 평균</div>
          <div className="text-2xl font-bold text-green-600">
            {formatTime(
              getWeekDates(selectedDate).reduce((acc, date) => acc + getTotalTimeForDate(date), 0) / 7
            )}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">이번 주 총합</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatTime(
              getWeekDates(selectedDate).reduce((acc, date) => acc + getTotalTimeForDate(date), 0)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <WritingTimeTracker />
    </div>
  );
}

export default App;
