import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Utensils, Coffee, Moon, Sun,
  Plus, CheckCircle2, Circle, Search,
  X, UserPlus, Calendar, Phone, Check, Trash2, AlertTriangle,
  FileText, ChevronLeft, ChevronRight, Printer, ChevronDown, ChevronUp,
  Banknote, Clock, ArrowLeft, Edit3, Save, History, Calculator, Settings, TrendingUp, TrendingDown
} from 'lucide-react';

export default function App() {
  // 1. STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState('attendance'); 
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverDietOnly, setShowOverDietOnly] = useState(false);
  
  const [settings, setSettings] = useState({ fullFee: 3300, halfFee: 2000, walkIn1: 100, walkIn2: 120 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [walkIns, setWalkIns] = useState({}); 
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInMeal, setWalkInMeal] = useState('lunch');
  const [walkInPrice, setWalkInPrice] = useState(100);
  const [isCustomWalkInPrice, setIsCustomWalkInPrice] = useState(false);

  const [students, setStudents] = useState([
    { id: '1', name: 'Rahul Sharma', phone: '9876543210', gender: 'male', membership: 'full', meals: { breakfast: true, lunch: true, dinner: true }, baseFee: 3300, joinDate: '2025-05-15', feeHistory: { '2026-06': { isPaid: true, amount: 3300, paidDate: '2026-06-15' } } },
    { id: '2', name: 'Priya Patel', phone: '9876543211', gender: 'female', membership: 'half', meals: { breakfast: false, lunch: true, dinner: true }, baseFee: 2000, joinDate: '2026-06-01', feeHistory: {} },
    { id: '3', name: 'Amit Singh', phone: '9876543212', gender: 'male', membership: 'full', meals: { breakfast: true, lunch: false, dinner: true }, baseFee: 3300, joinDate: '2026-05-10', feeHistory: { '2026-07': { isPaid: true, amount: 3300, paidDate: '2026-07-01' } } },
    { id: '4', name: 'Neha Gupta', phone: '9876543213', gender: 'female', membership: 'full', meals: { breakfast: false, lunch: true, dinner: false }, baseFee: 3300, joinDate: '2026-05-20', feeHistory: {} },
  ]);

  const [attendance, setAttendance] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMeal, setCurrentMeal] = useState('lunch');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [financeMonthStr, setFinanceMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');
  const [feePage, setFeePage] = useState(0);
  const [manualAttDate, setManualAttDate] = useState(currentDate);
  const [manualAttMeals, setManualAttMeals] = useState({ breakfast: false, lunch: false, dinner: false });

  // 2. LIFECYCLES (CLOCK & DYNAMIC MEAL)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 11) setCurrentMeal('breakfast');
    else if (hour < 16) setCurrentMeal('lunch');
    else setCurrentMeal('dinner');
  }, [currentTime]);

  useEffect(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    if (todayStr !== currentDate) setCurrentDate(todayStr);
  }, [currentTime, currentDate]);

  useEffect(() => {
    setAttendance(prev => {
      if (!prev[currentDate]) return { ...prev, [currentDate]: { breakfast: [], lunch: [], dinner: [] } };
      return prev;
    });
  }, [currentDate]);

  // 3. HIGH-PERFORMANCE EXPIRY & STATS ENGINE
  
  // Memoize raw attendance flat-map for lightning fast penalty calculations
  const studentAttendanceCounts = useMemo(() => {
    const counts = {};
    Object.entries(attendance).forEach(([date, dayRecord]) => {
      const monthStr = date.substring(0, 7);
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        if (dayRecord[meal]) {
          dayRecord[meal].forEach(id => {
            if (!counts[id]) counts[id] = { total: 0, byMonth: {} };
            if (!counts[id].byMonth[monthStr]) counts[id].byMonth[monthStr] = new Set();
            counts[id].byMonth[monthStr].add(date);
          });
        }
      });
    });
    return counts;
  }, [attendance]);

  const getExpiryDetails = (student) => {
    const history = student.feeHistory || {};
    const paidRecords = Object.values(history).filter(r => r.isPaid && r.paidDate);
    const daysPerPeriod = student.membership === 'half' ? 15 : 30;
    
    // Calculate Overdiet Penalty instantly using pre-computed map
    let totalOverDietPenalty = 0;
    const sAtt = studentAttendanceCounts[student.id]?.byMonth || {};
    
    Object.entries(sAtt).forEach(([month, daysSet]) => {
      if (daysSet.size > daysPerPeriod) {
        totalOverDietPenalty += (daysSet.size - daysPerPeriod);
      }
    });
    
    let expiryDate;
    let daysAllowed = daysPerPeriod;
    let latestPayment = student.joinDate;

    if (paidRecords.length > 0) {
      latestPayment = paidRecords.reduce((max, r) => r.paidDate > max ? r.paidDate : max, paidRecords[0].paidDate);
      const groups = paidRecords.filter(r => r.paidDate === latestPayment).length;
      daysAllowed = groups * daysPerPeriod;
      
      expiryDate = new Date(latestPayment);
      expiryDate.setDate(expiryDate.getDate() + daysAllowed - totalOverDietPenalty);
    } else {
      expiryDate = new Date(student.joinDate || currentDate);
      expiryDate.setDate(expiryDate.getDate() - totalOverDietPenalty);
    }
    
    const [tYear, tMonth, tDay] = currentDate.split('-').map(Number);
    const todayUTC = Date.UTC(tYear, tMonth - 1, tDay);
    const expiryUTC = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const startUTC = Date.UTC(new Date(latestPayment).getFullYear(), new Date(latestPayment).getMonth(), new Date(latestPayment).getDate());
    
    const diffDays = Math.floor((expiryUTC - todayUTC) / (1000 * 60 * 60 * 24));
    
    // Progress calculation
    const totalDuration = Math.floor((expiryUTC - startUTC) / (1000 * 60 * 60 * 24)) || daysPerPeriod;
    const daysUsed = totalDuration - diffDays;
    const progress = Math.max(0, Math.min(100, (daysUsed / totalDuration) * 100));

    let status = 'active';
    if (diffDays < 0) status = 'overdue';
    else if (diffDays <= 4) status = 'expiring';
    
    return {
      expiryDateStr: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      diffDays,
      status, 
      totalOverDietPenalty,
      progress,
      daysUsed: Math.max(0, daysUsed),
      totalDuration,
      latestPayment,
      activeExpiryDate: expiryDate
    };
  };

  // 4. COMPUTED DATA (ATTENDANCE & FILTERS)
  const eligibleStudents = useMemo(() => students.filter(s => s.meals[currentMeal]), [students, currentMeal]);
  const currentMealAttendance = attendance[currentDate]?.[currentMeal] || [];
  
  const { pendingStudents, completedStudents } = useMemo(() => {
    let pending = [];
    let completed = [];
    const query = searchQuery.toLowerCase();

    eligibleStudents.forEach(s => {
      if (query && !s.name.toLowerCase().includes(query) && !s.phone.includes(query)) return;
      if (currentMealAttendance.includes(s.id)) completed.push(s);
      else pending.push(s);
    });
    return { pendingStudents: pending, completedStudents: completed };
  }, [eligibleStudents, searchQuery, currentMealAttendance]);

  const totalEligible = eligibleStudents.length; // Re-added from missed declaration logic
  const todayWalkIns = walkIns[currentDate] || [];
  const walkInRevenue = todayWalkIns.reduce((sum, w) => sum + w.price, 0);

  // Get Limit of Active Days within a specific Month View
  const getLimitForMonth = (monthStr, latestPayment, expiryDate) => {
    if (!latestPayment || !expiryDate) return 0;
    const [y, m] = monthStr.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    const activeStart = new Date(latestPayment);
    const activeEnd = new Date(expiryDate);

    // Intersection
    const start = activeStart > monthStart ? activeStart : monthStart;
    const end = activeEnd < monthEnd ? activeEnd : monthEnd;

    if (start > end) return 0;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const monthlyStats = useMemo(() => {
    const stats = {};
    students.forEach(s => {
      stats[s.id] = { id: s.id, name: s.name, phone: s.phone, membership: s.membership, breakfast: 0, lunch: 0, dinner: 0, total: 0, daysAttended: 0 };
    });

    Object.entries(attendance).forEach(([date, dayRecord]) => {
      if (date.startsWith(currentMonthStr)) {
        const studentsThisDay = new Set();
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
          if (dayRecord[meal]) {
            dayRecord[meal].forEach(studentId => {
              if (stats[studentId]) {
                stats[studentId][meal]++;
                stats[studentId].total++;
                studentsThisDay.add(studentId);
              }
            });
          }
        });
        studentsThisDay.forEach(id => {
          if (stats[id]) stats[id].daysAttended++;
        });
      }
    });

    return Object.values(stats).map(stat => {
      const student = students.find(s => s.id === stat.id);
      const { latestPayment, activeExpiryDate } = getExpiryDetails(student);
      stat.limit = getLimitForMonth(currentMonthStr, latestPayment, activeExpiryDate);
      stat.isOverDiet = stat.daysAttended > stat.limit;
      return stat;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendance, students, currentMonthStr]);

  const displayedStats = useMemo(() => {
    return showOverDietOnly ? monthlyStats.filter(s => s.isOverDiet) : monthlyStats;
  }, [monthlyStats, showOverDietOnly]);

  const financeData = useMemo(() => {
    let membershipRevenue = 0, walkInRev = 0, walkInCount = 0;
    const paidMembers = [], pendingMembers = [];

    const [y, m] = financeMonthStr.split('-').map(Number);
    const prevD = new Date(y, m - 2);
    const prevMonthStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
    let prevMembershipRevenue = 0, prevWalkInRev = 0;

    Object.entries(walkIns).forEach(([date, dailyWalkins]) => {
      if (date.startsWith(financeMonthStr)) {
        dailyWalkins.forEach(w => { walkInRev += w.price; walkInCount++; });
      } else if (date.startsWith(prevMonthStr)) {
        dailyWalkins.forEach(w => { prevWalkInRev += w.price; });
      }
    });

    students.forEach(s => {
      const record = s.feeHistory?.[financeMonthStr];
      if (record && record.isPaid) {
        membershipRevenue += record.amount;
        paidMembers.push({ ...s, paidAmount: record.amount, paidDate: record.paidDate });
      } else if (s.joinDate && s.joinDate.substring(0, 7) <= financeMonthStr) {
        pendingMembers.push(s);
      }
      const prevRecord = s.feeHistory?.[prevMonthStr];
      if (prevRecord && prevRecord.isPaid) prevMembershipRevenue += prevRecord.amount;
    });

    const totalRevenue = membershipRevenue + walkInRev;
    const prevTotalRevenue = prevMembershipRevenue + prevWalkInRev;
    
    let growth = 0, growthTrend = 'neutral';
    if (prevTotalRevenue > 0) {
      growth = ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100;
      growthTrend = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';
    } else if (totalRevenue > 0) {
       growth = 100; growthTrend = 'up';
    }

    return { totalRevenue, membershipRevenue, walkInRevenue, walkInCount, paidMembers, pendingMembers, prevTotalRevenue, growth: Math.abs(growth).toFixed(1), growthTrend };
  }, [students, walkIns, financeMonthStr]);

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const d = new Date(year, parseInt(month) - 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (offset) => {
    const [year, month] = currentMonthStr.split('-').map(Number);
    const d = new Date(year, month - 1 + offset);
    setCurrentMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const changeFinanceMonth = (offset) => {
    const [year, month] = financeMonthStr.split('-').map(Number);
    const d = new Date(year, month - 1 + offset);
    setFinanceMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // 5. ACTIONS
  const toggleAttendance = (studentId) => {
    setAttendance(prev => {
      const dayRecord = prev[currentDate] || { breakfast: [], lunch: [], dinner: [] };
      const mealRecord = dayRecord[currentMeal] || [];
      const isPresent = mealRecord.includes(studentId);
      
      return {
        ...prev,
        [currentDate]: { 
          ...dayRecord, 
          [currentMeal]: isPresent ? mealRecord.filter(id => id !== studentId) : [...mealRecord, studentId] 
        }
      };
    });
  };

  // QUICK-MARK ALL PRESENT
  const markAllPresent = () => {
    if (pendingStudents.length === 0) return;
    const idsToAdd = pendingStudents.map(s => s.id);
    setAttendance(prev => {
      const dayRecord = prev[currentDate] || { breakfast: [], lunch: [], dinner: [] };
      const mealRecord = dayRecord[currentMeal] || [];
      return {
        ...prev,
        [currentDate]: {
          ...dayRecord,
          [currentMeal]: [...new Set([...mealRecord, ...idsToAdd])]
        }
      };
    });
  };

  const addStudent = (newStudent) => {
    setStudents(prev => [...prev, { ...newStudent, id: Date.now().toString(), nextMonthPaid: false, feeHistory: {} }]);
    setIsAddModalOpen(false);
  };

  const confirmDelete = (id) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setStudentToDelete(null);
  };

  const handleAddWalkIn = (e) => {
    e.preventDefault();
    setWalkIns(prev => ({
      ...prev, 
      [currentDate]: [{
        id: Date.now().toString(),
        name: walkInName.trim() || `Guest ${todayWalkIns.length + 1}`,
        phone: walkInPhone.trim(),
        meal: walkInMeal,
        price: walkInPrice,
        time: currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...(prev[currentDate] || [])]
    }));
    setWalkInName(''); setWalkInPhone('');
    setWalkInPrice(settings.walkIn1); setIsCustomWalkInPrice(false);
  };

  const deleteWalkIn = (id) => {
    setWalkIns(prev => ({ ...prev, [currentDate]: (prev[currentDate] || []).filter(w => w.id !== id) }));
  };

  const saveStudentDetails = (id) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name: editName, phone: editPhone, joinDate: editJoinDate } : s));
    setViewingStudentId(null);
  };

  const saveManualAttendance = (id) => {
    setAttendance(prev => {
      const dayRecord = prev[manualAttDate] || { breakfast: [], lunch: [], dinner: [] };
      const updatedRecord = { ...dayRecord };
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        const currentList = updatedRecord[meal] || [];
        if (manualAttMeals[meal] && !currentList.includes(id)) updatedRecord[meal] = [...currentList, id];
        else if (!manualAttMeals[meal] && currentList.includes(id)) updatedRecord[meal] = currentList.filter(sId => sId !== id);
      });
      return { ...prev, [manualAttDate]: updatedRecord };
    });
  };

  const togglePastFee = (id, monthStr) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const history = s.feeHistory || {};
      const rec = history[monthStr] || { isPaid: false };
      if (rec.invoiceGenerated) return s;

      const newIsPaid = !rec.isPaid;
      return { 
        ...s, 
        feeHistory: { 
          ...history, 
          [monthStr]: {
            ...rec,
            isPaid: newIsPaid,
            amount: newIsPaid ? (rec.amount || s.baseFee) : 0,
            paidDate: newIsPaid ? (rec.paidDate || currentDate) : null
          } 
        } 
      };
    }));
  };

  const updatePastFeeAmount = (id, monthStr, newAmount) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const history = s.feeHistory || {};
      const rec = history[monthStr] || { isPaid: false, amount: 0 };
      if (rec.invoiceGenerated) return s;
      return { ...s, feeHistory: { ...history, [monthStr]: { ...rec, amount: newAmount } } };
    }));
  };

  const updatePastFeeDate = (id, monthStr, newDateStr) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const history = s.feeHistory || {};
      const rec = history[monthStr] || { isPaid: false, amount: 0 };
      if (rec.invoiceGenerated) return s;
      return { ...s, feeHistory: { ...history, [monthStr]: { ...rec, paidDate: newDateStr } } };
    }));
  };

  const generateInvoice = (id, monthStr) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const history = s.feeHistory || {};
      const rec = history[monthStr];
      if (!rec || !rec.isPaid || rec.invoiceGenerated) return s;
      setTimeout(() => window.print(), 100);
      return { ...s, feeHistory: { ...history, [monthStr]: { ...rec, invoiceGenerated: true } } };
    }));
  };

  const openStudentProfile = (student) => {
    setViewingStudentId(student.id);
    setEditName(student.name);
    setEditPhone(student.phone || '');
    setEditJoinDate(student.joinDate || currentDate);
    setManualAttDate(currentDate);
    setFeePage(0);
  };

  const shiftManualDate = (offset) => {
    const d = new Date(manualAttDate);
    d.setDate(d.getDate() + offset);
    if (d <= currentTime) setManualAttDate(d.toISOString().split('T')[0]);
  };

  const selectAllApplicableMeals = (studentMeals) => {
    setManualAttMeals({ breakfast: studentMeals.breakfast, lunch: studentMeals.lunch, dinner: studentMeals.dinner });
  };

  useEffect(() => {
    if (viewingStudentId) {
       const dayRecord = attendance[manualAttDate] || { breakfast: [], lunch: [], dinner: [] };
       setManualAttMeals({
         breakfast: (dayRecord.breakfast || []).includes(viewingStudentId),
         lunch: (dayRecord.lunch || []).includes(viewingStudentId),
         dinner: (dayRecord.dinner || []).includes(viewingStudentId)
       });
    }
  }, [manualAttDate, viewingStudentId, attendance]);

  // --------------------------------------------------------
  // 6. SUB-COMPONENTS
  // --------------------------------------------------------
  const getMealIcon = (meal, size = 20) => {
    if(meal === 'breakfast') return <Coffee size={size} />;
    if(meal === 'lunch') return <Sun size={size} />;
    return <Moon size={size} />;
  };

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> Settings</h2>
          <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-gray-700 rounded-full"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Full Membership Fee</label>
            <input type="number" value={settings.fullFee} onChange={(e) => setSettings({...settings, fullFee: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Half Membership Fee</label>
            <input type="number" value={settings.halfFee} onChange={(e) => setSettings({...settings, halfFee: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Walk-in Price 1</label>
              <input type="number" value={settings.walkIn1} onChange={(e) => setSettings({...settings, walkIn1: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Walk-in Price 2</label>
              <input type="number" value={settings.walkIn2} onChange={(e) => setSettings({...settings, walkIn2: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-bold" />
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl mt-4">Save Configuration</button>
        </div>
      </div>
    </div>
  );

  const AddStudentModal = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('male');
    const [membership, setMembership] = useState('full');
    const [meals, setMeals] = useState({ breakfast: false, lunch: true, dinner: true });
    const [baseFee, setBaseFee] = useState(settings.fullFee);
    const [joinDate, setJoinDate] = useState(currentDate);
    const [isCustomFee, setIsCustomFee] = useState(false);
    const [error, setError] = useState('');

    const handleMembershipChange = (type) => {
      setMembership(type);
      if (!isCustomFee) setBaseFee(type === 'full' ? settings.fullFee : settings.halfFee);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) return setError('Please enter a student name.');
      addStudent({ name, phone, gender, membership, meals, baseFee, joinDate });
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white sticky top-0 z-10">
            <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus size={24} /> New Student</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-blue-700 rounded-full transition-colors"><X size={24} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone / ID (Optional)</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 9876543210" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button type="button" onClick={() => setGender('male')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${gender === 'male' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Male</button>
                    <button type="button" onClick={() => setGender('female')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${gender === 'female' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Female</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Membership</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button type="button" onClick={() => handleMembershipChange('full')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${membership === 'full' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Full</button>
                    <button type="button" onClick={() => handleMembershipChange('half')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${membership === 'half' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Half</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                  <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee Amount</label>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => { setIsCustomFee(false); setBaseFee(membership === 'full' ? settings.fullFee : settings.halfFee); }} className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 ${!isCustomFee ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>Default</button>
                    <button type="button" onClick={() => setIsCustomFee(true)} className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 ${isCustomFee ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>Custom</button>
                  </div>
                  {isCustomFee && (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input type="number" value={baseFee} onChange={(e) => setBaseFee(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-4 outline-none font-bold" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Meal Subscription Plan</label>
              <div className="space-y-3">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <label key={meal} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${meals[meal] ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{getMealIcon(meal, 18)}</div>
                      <span className="capitalize font-medium text-gray-700">{meal}</span>
                    </div>
                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${meals[meal] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {meals[meal] && <Check size={16} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={meals[meal]} onChange={(e) => setMeals({...meals, [meal]: e.target.checked})} />
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Save Student</button>
          </form>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} className="text-red-500" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Student?</h2>
        <p className="text-gray-500 mb-6">Are you sure you want to remove <strong>{studentToDelete?.name}</strong>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setStudentToDelete(null)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
          <button onClick={() => confirmDelete(studentToDelete.id)} className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-20 md:pb-0 print:hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex justify-around p-2 md:relative md:w-20 md:h-screen md:flex-col md:justify-start md:pt-6 md:gap-4 md:border-t-0 md:border-r">
        {[
          { id: 'attendance', icon: CheckCircle2, label: 'Attend', color: 'orange' },
          { id: 'students', icon: Users, label: 'Students', color: 'blue' },
          { id: 'walkins', icon: Banknote, label: 'Walk-ins', color: 'emerald' },
          { id: 'history', icon: FileText, label: 'Records', color: 'indigo' },
          { id: 'finance', icon: TrendingUp, label: 'Finance', color: 'violet' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setViewingStudentId(null); }}
            className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === tab.id ? `text-${tab.color}-600 bg-${tab.color}-50 scale-105 shadow-sm` : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
          >
            <tab.icon size={22} className="mb-1" />
            <span className="text-[9px] font-bold tracking-wide uppercase">{tab.label}</span>
          </button>
        ))}
        
        <div className="md:mt-auto md:mb-6">
          <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center p-3 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-all w-full">
            <Settings size={22} className="mb-1" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Settings</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-3xl mx-auto w-full relative">
        
        {/* ======================================================== */}
        {/* VIEW 1: ATTENDANCE */}
        {/* ======================================================== */}
        {activeTab === 'attendance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="bg-orange-500 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6">
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-extrabold">Mess Manager</h1>
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                  <div className="text-orange-100 text-xs font-medium uppercase tracking-wide">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                </div>
              </div>

              <div className="flex bg-orange-600/50 p-1.5 rounded-2xl mt-4 backdrop-blur-sm shadow-inner relative">
                {['breakfast', 'lunch', 'dinner'].map((meal) => {
                  const isActive = currentMeal === meal;
                  return (
                    <div key={meal} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold capitalize transition-all duration-300 relative ${isActive ? 'bg-white text-orange-600 shadow-sm transform scale-[1.02]' : 'text-white opacity-60 cursor-not-allowed'}`}>
                      {isActive && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                      {getMealIcon(meal, 16)}
                      <span className="hidden sm:inline">{meal}</span>
                    </div>
                  );
                })}
              </div>
            </header>

            <div className="px-6 space-y-5 pb-24">
              <div className="flex gap-4">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between flex-1">
                  <div>
                    <p className="text-gray-500 text-sm font-medium capitalize">{currentMeal} Attendance</p>
                    <p className="text-3xl font-black text-gray-800">
                      {currentMealAttendance.length} <span className="text-lg text-gray-400 font-medium">/ {totalEligible}</span>
                    </p>
                  </div>
                </div>
                {pendingStudents.length > 0 && (
                  <button onClick={markAllPresent} className="bg-orange-100 text-orange-600 rounded-3xl p-4 flex flex-col items-center justify-center shadow-sm hover:bg-orange-200 active:scale-95 transition-all w-28 border border-orange-200">
                    <CheckCircle2 size={24} className="mb-1"/>
                    <span className="text-[10px] font-bold uppercase text-center leading-tight">Mark All<br/>Present</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder={`Search in ${currentMeal} list...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="space-y-3">
                {pendingStudents.length === 0 ? (
                  <div className="text-center py-10 bg-green-50 rounded-3xl border border-green-100">
                    <CheckCircle2 className="text-green-500 mx-auto mb-2" size={32} />
                    <p className="text-green-700 font-bold text-lg">All caught up!</p>
                  </div>
                ) : (
                  pendingStudents.map(student => {
                    const { status } = getExpiryDetails(student);
                    const isOverdue = status === 'overdue';
                    
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleAttendance(student.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 border-2 text-left shadow-sm active:scale-[0.98] ${isOverdue ? 'bg-red-50 border-red-200 ring-1 ring-red-500' : 'bg-white border-transparent hover:border-orange-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${student.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-gray-800 leading-tight">{student.name}</h3>
                              {isOverdue && <span className="bg-red-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Overdue</span>}
                            </div>
                            <p className="text-gray-500 text-xs font-medium mt-0.5">{student.phone}</p>
                          </div>
                        </div>
                        <Circle size={28} className={isOverdue ? "text-red-300" : "text-gray-300"} />
                      </button>
                    )
                  })
                )}

                {}
                {completedStudents.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <button onClick={() => setShowCompleted(!showCompleted)} className="w-full py-2 text-gray-500 font-semibold text-sm flex items-center justify-center gap-2">
                      {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showCompleted ? 'Hide' : 'Show'} Marked Students ({completedStudents.length})
                    </button>
                    {showCompleted && (
                      <div className="space-y-3 mt-4 opacity-75">
                        {completedStudents.map(student => (
                          <button key={student.id} onClick={() => toggleAttendance(student.id)} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-orange-50 border-orange-500 text-left">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <h3 className="font-bold text-orange-900">{student.name}</h3>
                            </div>
                            <CheckCircle2 size={28} className="text-orange-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: DIRECTORY & PROFILES */}
        {/* ======================================================== */}
        {activeTab === 'students' && (
          <div className="animate-in fade-in duration-300">
            {!viewingStudentId ? (
              <>
                <header className="bg-gray-900 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-extrabold mb-1">Students</h1>
                    <p className="text-gray-400 text-sm font-medium">Manage accounts & validity</p>
                  </div>
                  <div className="bg-gray-800 px-4 py-2 rounded-xl text-center">
                    <span className="block text-2xl font-black">{students.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total</span>
                  </div>
                </header>

                <div className="px-6 space-y-4 pb-24">
                  {students.map(student => {
                    const { expiryDateStr, diffDays, status, progress, daysUsed } = getExpiryDetails(student);
                    const isOverdue = status === 'overdue';

                    return (
                      <div key={student.id} className={`p-5 rounded-2xl shadow-sm border transition-all flex flex-col gap-4 ${isOverdue ? 'bg-red-50 border-red-200 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${student.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-800 text-lg leading-tight">{student.name}</h3>
                                {isOverdue && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Overdue</span>}
                              </div>
                              <p className="text-gray-500 text-xs mt-0.5 font-medium">{student.phone}</p>
                            </div>
                          </div>
                          <button onClick={() => openStudentProfile(student)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 bg-white">
                            <Edit3 size={18} />
                          </button>
                        </div>
                        
                        {/* PROGRESS BAR UI */}
                        <div className="mt-1">
                          <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className={isOverdue ? 'text-red-600' : 'text-gray-500'}>
                              {isOverdue ? `Expired ${Math.abs(diffDays)} days ago` : `${daysUsed} Days Used`}
                            </span>
                            <span className="text-gray-400">Valid till {expiryDateStr}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${isOverdue ? 'bg-red-500' : progress > 85 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(progress, 100)}%`}}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-blue-600 text-white w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40">
                  <Plus size={28} />
                </button>
              </>
            ) : (
              /* INDIVIDUAL PROFILE */
              (() => {
                const s = students.find(x => x.id === viewingStudentId);
                if (!s) return null;
                const { expiryDateStr, diffDays, status, totalOverDietPenalty } = getExpiryDetails(s);

                const getMonthsBetween = (startDateStr) => {
                  const start = new Date(startDateStr || currentDate);
                  let end = new Date(currentDate);
                  if (start > end) end = new Date(start); 
                  const months = [];
                  let current = new Date(end.getFullYear(), end.getMonth(), 1);
                  const min = new Date(start.getFullYear(), start.getMonth(), 1);
                  while (current >= min) {
                    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
                    current.setMonth(current.getMonth() - 1);
                  }
                  return months;
                };

                const allMonths = getMonthsBetween(s.joinDate);
                const totalPages = Math.ceil(allMonths.length / 10) || 1;
                const paginatedMonths = allMonths.slice(feePage * 10, (feePage + 1) * 10);

                return (
                  <div className="animate-in slide-in-from-right-8 duration-300 pb-24">
                    <header className="bg-gray-900 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6">
                      <button onClick={() => setViewingStudentId(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm font-medium">
                        <ArrowLeft size={16} /> Back
                      </button>
                      <h1 className="text-2xl font-extrabold mb-1">{s.name}</h1>
                      <div className="flex gap-2 mb-4">
                        <span className="text-xs px-2 py-1 rounded-md bg-gray-800 border border-gray-700 font-bold uppercase">{s.membership} Plan</span>
                        {totalOverDietPenalty > 0 && <span className="text-xs px-2 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/50 font-bold flex items-center gap-1"><Calculator size={12}/> -{totalOverDietPenalty} Days Penalty</span>}
                      </div>

                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Valid Till</p>
                          <p className={`font-black text-lg ${status==='active'?'text-emerald-400':status==='expiring'?'text-orange-400':'text-red-400'}`}>{expiryDateStr}</p>
                        </div>
                        <div className="text-right">
                           <p className={`text-sm font-bold ${status==='active'?'text-emerald-400':status==='expiring'?'text-orange-400':'text-red-400'}`}>
                            {status === 'active' && `${diffDays} days left`}
                            {status === 'expiring' && `Ends in ${diffDays} days`}
                            {status === 'overdue' && `Overdue by ${Math.abs(diffDays)} days`}
                          </p>
                        </div>
                      </div>
                    </header>

                    <div className="px-6 space-y-6">
                      {/* PAST ATTENDANCE CORRECTION */}
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><History size={18} className="text-orange-500"/> Rectify Past Attendance</h3>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <button onClick={() => shiftManualDate(-1)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><ChevronLeft size={18}/></button>
                          <input type="date" value={manualAttDate} onChange={(e) => setManualAttDate(e.target.value)} max={currentDate} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold outline-none text-center" />
                          <button onClick={() => shiftManualDate(1)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><ChevronRight size={18}/></button>
                        </div>

                        <div className="flex gap-2 mb-4">
                          {['breakfast', 'lunch', 'dinner'].map(meal => {
                            const isSubscribed = s.meals[meal];
                            return (
                              <button key={meal} disabled={!isSubscribed} onClick={() => setManualAttMeals(prev => ({ ...prev, [meal]: !prev[meal] }))} className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border ${!isSubscribed ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed' : manualAttMeals[meal] ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200'}`}>
                                {getMealIcon(meal, 16)}
                                <span className="text-[10px] font-bold uppercase mt-1">{meal}</span>
                              </button>
                            )
                          })}
                        </div>
                        
                        <div className="flex gap-2">
                          <button onClick={() => selectAllApplicableMeals(s.meals)} className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl text-xs">Select Allowed Meals</button>
                          <button onClick={() => saveManualAttendance(s.id)} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1"><CheckCircle2 size={14}/> Update Record</button>
                        </div>
                      </div>

                      {/* FEE HISTORY */}
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Banknote size={18} className="text-emerald-500"/> Payments & Invoices</h3>
                        <div className="space-y-3">
                          {paginatedMonths.map(mStr => {
                            const rec = s.feeHistory?.[mStr] || { isPaid: false };
                            const isLocked = rec.invoiceGenerated;

                            return (
                              <div key={mStr} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-sm text-gray-700 flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> {formatMonth(mStr)}</span>
                                  <button onClick={() => togglePastFee(s.id, mStr)} disabled={isLocked} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isLocked?'bg-gray-100 text-gray-400 cursor-not-allowed':rec.isPaid?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-white text-red-500 border-red-200'}`}>
                                    {rec.isPaid ? 'Paid' : 'Mark Paid'}
                                  </button>
                                </div>
                                {rec.isPaid && (
                                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                                    <input type="date" value={rec.paidDate||''} onChange={(e) => updatePastFeeDate(s.id, mStr, e.target.value)} disabled={isLocked} className="text-xs font-bold text-gray-600 outline-none w-28 bg-transparent disabled:opacity-50"/>
                                    <button onClick={() => generateInvoice(s.id, mStr)} disabled={isLocked} className={`text-[10px] font-bold px-2 py-1 rounded-md ${isLocked?'text-indigo-300':'bg-indigo-500 text-white'}`}>
                                      {isLocked ? 'Invoice Locked' : 'Generate Invoice'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <button onClick={() => setFeePage(p => Math.max(0, p - 1))} disabled={feePage === 0} className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                            <span className="text-xs font-bold text-gray-400">Page {feePage + 1} of {totalPages}</span>
                            <button onClick={() => setFeePage(p => Math.min(totalPages - 1, p + 1))} disabled={feePage === totalPages - 1} className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )
               })()
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: WALK-INS */}
        {/* ======================================================== */}
        {activeTab === 'walkins' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="bg-emerald-600 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6">
              <h1 className="text-3xl font-extrabold mb-6">Walk-ins</h1>
              <div className="bg-emerald-700/50 rounded-2xl p-4 backdrop-blur-sm shadow-inner flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Today's Revenue</p>
                  <p className="text-3xl font-black">₹{walkInRevenue}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Guests</p>
                  <p className="text-2xl font-bold">{todayWalkIns.length}</p>
                </div>
              </div>
            </header>

            <div className="px-6 space-y-6 pb-24">
              <form onSubmit={handleAddWalkIn} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={walkInName} onChange={e=>setWalkInName(e.target.value)} placeholder="Guest Name" className="bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-medium text-sm" />
                  <input type="tel" value={walkInPhone} onChange={e=>setWalkInPhone(e.target.value)} placeholder="Phone" className="bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-medium text-sm" />
                </div>
                
                <div className="flex gap-2">
                  {['breakfast', 'lunch', 'dinner'].map(m => (
                    <button key={m} type="button" onClick={() => setWalkInMeal(m)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-xl transition-all ${walkInMeal === m ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{m}</button>
                  ))}
                </div>

                <div className="flex gap-2">
                  {[settings.walkIn1, settings.walkIn2].map(price => (
                    <button key={price} type="button" onClick={() => {setIsCustomWalkInPrice(false); setWalkInPrice(price);}} className={`flex-1 py-3 font-bold rounded-xl border-2 ${!isCustomWalkInPrice && walkInPrice === price ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500'}`}>₹{price}</button>
                  ))}
                  <button type="button" onClick={() => setIsCustomWalkInPrice(true)} className={`flex-1 py-3 font-bold rounded-xl border-2 ${isCustomWalkInPrice ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500'}`}>Custom</button>
                </div>
                
                {isCustomWalkInPrice && <input type="number" value={walkInPrice} onChange={e=>setWalkInPrice(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none font-bold text-center" placeholder="Enter Custom Price" />}

                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">Add Walk-in</button>
              </form>
              
              <div className="space-y-3">
                {todayWalkIns.map(w => (
                  <div key={w.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                     <div>
                       <p className="font-bold text-sm text-gray-800">{w.name}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{w.meal} . {w.time}</p>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="font-black text-emerald-600">₹{w.price}</span>
                       <button onClick={() => deleteWalkIn(w.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {}
        {/* ======================================================== */}
        {/* VIEW 4: FINANCE */}
        {/* ======================================================== */}
        {activeTab === 'finance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="bg-violet-600 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold">Finance</h1>
                <button onClick={() => window.print()} className="p-2 bg-violet-500 rounded-xl"><Printer size={20}/></button>
              </div>
              
              <div className="flex items-center justify-between bg-violet-700/50 p-2 rounded-2xl backdrop-blur-sm mb-6">
                <button onClick={() => changeFinanceMonth(-1)} className="p-2 hover:bg-violet-500 rounded-xl"><ChevronLeft size={20}/></button>
                <div className="font-bold tracking-wide uppercase text-sm">{formatMonth(financeMonthStr)}</div>
                <button onClick={() => changeFinanceMonth(1)} className="p-2 hover:bg-violet-500 rounded-xl"><ChevronRight size={20}/></button>
              </div>

              <div className="text-center mb-4">
                 <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                 <p className="text-5xl font-black">₹{financeData.totalRevenue.toLocaleString()}</p>
                 <div className="flex items-center justify-center mt-2">
                    {financeData.growthTrend === 'up' && <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded border border-emerald-500/50"><TrendingUp size={14}/> +{financeData.growth}% vs Last Month</span>}
                    {financeData.growthTrend === 'down' && <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-500/20 text-rose-200 px-2 py-1 rounded border border-rose-500/50"><TrendingDown size={14}/> -{financeData.growth}% vs Last Month</span>}
                 </div>
              </div>
            </header>
            
            <div className="px-6 space-y-6 pb-24">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Memberships</p>
                  <p className="text-xl font-black text-gray-800">₹{financeData.membershipRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{financeData.paidMembers.length} Payments</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Walk-ins</p>
                  <p className="text-xl font-black text-gray-800">₹{financeData.walkInRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{financeData.walkInCount} Guests</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><CheckCircle2 size={18} className="text-emerald-500"/> Paid This Month</h3>
                <div className="space-y-3">
                  {financeData.paidMembers.length === 0 ? <p className="text-center text-sm text-gray-400">No payments yet.</p> : 
                    financeData.paidMembers.map(s => (
                      <div key={s.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <div>
                          <p className="font-bold text-sm text-gray-800">{s.name}</p>
                          <p className="text-[10px] text-gray-400">Paid: {new Date(s.paidDate).toLocaleDateString()}</p>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm">₹{s.paidAmount}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><AlertTriangle size={18} className="text-orange-500"/> Pending Payments</h3>
                <div className="space-y-3">
                  {financeData.pendingMembers.length === 0 ? <p className="text-center text-sm text-gray-400">All settled!</p> : 
                    financeData.pendingMembers.map(s => (
                      <div key={s.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <p className="font-bold text-sm text-gray-800">{s.name}</p>
                        <button onClick={() => { setActiveTab('students'); openStudentProfile(s); }} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Manage</button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {/* ======================================================== */}
        {/* VIEW 5: DIET RECORDS */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="bg-indigo-600 text-white pt-10 pb-6 px-6 rounded-b-[2.5rem] shadow-lg mb-6">
              <h1 className="text-3xl font-extrabold mb-6">Diet Records</h1>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-indigo-700/50 p-2 rounded-2xl backdrop-blur-sm">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-indigo-500 rounded-xl"><ChevronLeft size={20}/></button>
                  <div className="font-bold tracking-wide uppercase text-sm">{formatMonth(currentMonthStr)}</div>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-indigo-500 rounded-xl"><ChevronRight size={20}/></button>
                </div>
                <button onClick={() => setShowOverDietOnly(!showOverDietOnly)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${showOverDietOnly ? 'bg-red-500 text-white' : 'bg-white text-indigo-700'}`}>
                  <AlertTriangle size={18} /> {showOverDietOnly ? 'Showing Over-Diet Students' : 'Filter Over-Diet Students'}
                </button>
              </div>
            </header>

            <div className="px-6 space-y-4 pb-24">
              {displayedStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No records found.</div>
              ) : (
                displayedStats.map(stat => (
                  <div key={stat.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex flex-col gap-4 ${stat.isOverDiet ? 'border-red-300' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{stat.name}</h3>
                        {stat.isOverDiet && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Over Limit</span>}
                      </div>
                      <div className="text-right">
                        <span className={`block text-2xl font-black ${stat.isOverDiet ? 'text-red-500' : 'text-indigo-600'}`}>{stat.daysAttended} <span className="text-sm text-gray-400 font-medium">/ {stat.limit}</span></span>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Days Attended</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between px-2">
                      <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-gray-500 text-xs mb-1 font-medium"><Coffee size={12} /> B</div><span className="font-bold text-gray-700">{stat.breakfast}</span></div>
                      <div className="w-px bg-gray-100"></div>
                      <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-gray-500 text-xs mb-1 font-medium"><Sun size={12} /> L</div><span className="font-bold text-gray-700">{stat.lunch}</span></div>
                      <div className="w-px bg-gray-100"></div>
                      <div className="flex flex-col items-center"><div className="flex items-center gap-1 text-gray-500 text-xs mb-1 font-medium"><Moon size={12} /> D</div><span className="font-bold text-gray-700">{stat.dinner}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
      
      {}
      {isAddModalOpen && <AddStudentModal />}
      {studentToDelete && <DeleteConfirmModal />}
      {isSettingsOpen && <SettingsModal />}
    </div>

    {/* PRINT VIEW - COMPACT PDF GENERATION */}
    <div className="hidden print:block bg-white p-8 w-full max-w-4xl mx-auto text-black">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black uppercase mb-1">Mess Attendance Record</h1>
        <p className="text-gray-600 font-bold">{formatMonth(currentMonthStr)}</p>
      </div>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-800 p-1.5 text-center">S.No.</th>
            <th className="border border-gray-800 p-1.5 text-left">Student Name</th>
            <th className="border border-gray-800 p-1.5 text-center">Breakfast</th>
            <th className="border border-gray-800 p-1.5 text-center">Lunch</th>
            <th className="border border-gray-800 p-1.5 text-center">Dinner</th>
            <th className="border border-gray-800 p-1.5 text-center font-bold bg-gray-200">Days / Limit</th>
          </tr>
        </thead>
        <tbody>
          {monthlyStats.length === 0 ? (
            <tr><td colSpan="6" className="border border-gray-800 p-2 text-center text-gray-500">No records found.</td></tr>
          ) : (
            monthlyStats.map((stat, index) => (
              <tr key={stat.name}>
                <td className="border border-gray-800 p-1 text-center">{index + 1}</td>
                <td className="border border-gray-800 p-1 font-bold">{stat.name} {stat.isOverDiet && '(!)'}</td>
                <td className="border border-gray-800 p-1 text-center">{stat.breakfast}</td>
                <td className="border border-gray-800 p-1 text-center">{stat.lunch}</td>
                <td className="border border-gray-800 p-1 text-center">{stat.dinner}</td>
                <td className={`border border-gray-800 p-1 text-center font-bold ${stat.isOverDiet ? 'bg-red-100' : 'bg-gray-100'}`}>{stat.daysAttended} / {stat.limit}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}
