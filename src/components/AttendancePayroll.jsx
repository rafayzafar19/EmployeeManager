import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

// Helper function to apply cell styling
const applyCellStyle = (cell, isLWP) => {
  if (isLWP) {
    // Red background for LWP
    cell.s = {
      fill: { 
        patternType: "solid", 
        fgColor: { rgb: "FFFF0000" }
      },
      font: { 
        color: { rgb: "FFFFFFFF" }, 
        bold: true
      }
    };
  } else {
    // Green background for Present
    cell.s = {
      fill: { 
        patternType: "solid", 
        fgColor: { rgb: "FF00FF00" }
      },
      font: { 
        color: { rgb: "FF000000" }, 
        bold: true
      }
    };
  }
};

export default function AttendanceApp() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [pastAttendance, setPastAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewPastDate, setViewPastDate] = useState("");
  const [showPastViewer, setShowPastViewer] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  // Load past attendance from localStorage on start
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("attendanceRecords")) || {};
    setPastAttendance(stored);
    if (stored[selectedDate]) setAttendance(stored[selectedDate]);
  }, [selectedDate]);

  // Save attendance in localStorage
  const saveAttendance = () => {
    const updated = { ...pastAttendance, [selectedDate]: attendance };
    setPastAttendance(updated);
    localStorage.setItem("attendanceRecords", JSON.stringify(updated));
    alert("Attendance saved!");
  };

  // Handle Excel upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const emps = data.map((row, index) => ({
        id: row["Card No"] || index,
        name: row["Employee Name"] || "",
        duty: row["Place of Duty"] || "",
        salary: parseFloat(row[" Salary Amount (Rs,)"]) || 0,
      }));
      setEmployees(emps);
    };
    reader.readAsBinaryString(file);
  };

  // Mark attendance
  const markAttendance = (id, status) => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  };

  // Helper function to get attendance status with default
  const getAttendanceStatus = (records, empId) => {
    return records[empId] || "Present";
  };

  // Export daily attendance Excel
  const exportDailyAttendance = () => {
    if (!employees.length) return alert("No employees loaded.");
    const records = employees.map((emp) => ({
      Date: selectedDate,
      Name: emp.name,
      Duty: emp.duty,
      Attendance: getAttendanceStatus(attendance, emp.id),
    }));
    const ws = XLSX.utils.json_to_sheet(records);
    
    // Add cell styling for attendance status
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const attendanceCell = XLSX.utils.encode_cell({ r: R, c: 3 }); // Attendance column (D)
      const attendanceValue = ws[attendanceCell]?.v;
      
      if (attendanceValue === "LWP") {
        applyCellStyle(ws[attendanceCell], true);
      } else if (attendanceValue === "Present") {
        applyCellStyle(ws[attendanceCell], false);
      }
    }
    
    // Set column widths for better formatting
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 20 }, // Name
      { width: 15 }, // Duty
      { width: 15 }  // Attendance
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Attendance_${selectedDate}.xlsx`);
  };

  // Get filtered employees for past attendance view
  const getFilteredEmployees = () => {
    if (!employees.length || !viewPastDate || !pastAttendance[viewPastDate]) return [];
    
    const attendanceRecords = pastAttendance[viewPastDate];
    return employees.filter(emp => {
      const status = getAttendanceStatus(attendanceRecords, emp.id);
      return filterStatus === "All" || status === filterStatus;
    });
  };

  // Export past attendance record
  const exportPastAttendance = () => {
    if (!viewPastDate || !pastAttendance[viewPastDate]) return;
    
    const records = employees.map((emp) => ({
      Date: viewPastDate,
      Name: emp.name,
      Duty: emp.duty,
      Attendance: getAttendanceStatus(pastAttendance[viewPastDate], emp.id),
    }));
    
    const ws = XLSX.utils.json_to_sheet(records);
    
    // Add cell styling for attendance status
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const attendanceCell = XLSX.utils.encode_cell({ r: R, c: 3 }); // Attendance column (D)
      const attendanceValue = ws[attendanceCell]?.v;
      
      if (attendanceValue === "LWP") {
        applyCellStyle(ws[attendanceCell], true);
      } else if (attendanceValue === "Present") {
        applyCellStyle(ws[attendanceCell], false);
      }
    }
    
    // Set column widths for better formatting
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 20 }, // Name
      { width: 15 }, // Duty
      { width: 15 }  // Attendance
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance_${viewPastDate}`);
    XLSX.writeFile(wb, `Past_Attendance_${viewPastDate}.xlsx`);
  };

  // Get attendance statistics for a date
  const getAttendanceStats = (date) => {
    if (!pastAttendance[date] || !employees.length) return null;
    
    const records = pastAttendance[date];
    const total = employees.length;
    // Count present as those who are explicitly marked "Present" OR not marked at all (default to present)
    const present = employees.filter(emp => records[emp.id] === "Present" || records[emp.id] === undefined).length;
    const lwp = employees.filter(emp => records[emp.id] === "LWP").length;
    
    return { total, present, lwp };
  };

  // Generate monthly summary (attendance + payroll)
  const generateMonthlySummary = () => {
    const month = selectedDate.slice(0, 7); // "YYYY-MM"
    const monthlyRecords = Object.entries(pastAttendance).filter(([date]) =>
      date.startsWith(month)
    );

    if (!monthlyRecords.length) {
      alert("No attendance data for this month.");
      return;
    }

    // Count LWP for each employee
    const empStats = {};
    employees.forEach((emp) => {
      empStats[emp.id] = { name: emp.name, duty: emp.duty, salary: emp.salary, LWP: 0 };
    });

    monthlyRecords.forEach(([date, records]) => {
      employees.forEach((emp) => {
        if (records[emp.id] === "LWP") {
          empStats[emp.id].LWP += 1;
        }
      });
    });

    const totalDays = monthlyRecords.length;
    const allowedLWP = 2.6; // monthly leave with pay

    const payroll = employees.map((emp) => {
      const stats = empStats[emp.id];
      const unpaidLWP = Math.max(0, stats.LWP - allowedLWP);

      let salaryToBePaid = stats.salary;
      if (unpaidLWP > 0 && totalDays > 0) {
        salaryToBePaid = stats.salary - (stats.salary / totalDays) * unpaidLWP;
      }

      return {
        Name: stats.name,
        Duty: stats.duty,
        Salary: stats.salary,
        TotalDays: totalDays,
        LWP: stats.LWP,
        PaidDays: totalDays - stats.LWP,
        NetPay: Math.round(salaryToBePaid),
      };
    });

    // Export Excel with 2 sheets
    const wb = XLSX.utils.book_new();

    // Create properly formatted attendance summary
    const formattedAttendanceData = [];
    
    // Add header row
    formattedAttendanceData.push({
      Date: "Date",
      Name: "Employee Name", 
      Duty: "Place of Duty",
      Attendance: "Attendance Status"
    });
    
    // Add empty row for spacing
    formattedAttendanceData.push({
      Date: "",
      Name: "",
      Duty: "",
      Attendance: ""
    });
    
    // Group by date and add attendance records
    monthlyRecords.forEach(([date, records]) => {
      // Add date header
      formattedAttendanceData.push({
        Date: `Date: ${date}`,
        Name: "",
        Duty: "",
        Attendance: ""
      });
      
      // Add employee records for this date
      employees.forEach((emp) => {
        formattedAttendanceData.push({
          Date: "",
          Name: emp.name,
          Duty: emp.duty,
          Attendance: getAttendanceStatus(records, emp.id),
        });
      });
      
      // Add empty row between dates
      formattedAttendanceData.push({
        Date: "",
        Name: "",
        Duty: "",
        Attendance: ""
      });
    });

    const summarySheet = XLSX.utils.json_to_sheet(formattedAttendanceData);
    
    // Add cell styling for attendance status in the summary sheet
    const range = XLSX.utils.decode_range(summarySheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      const attendanceCell = XLSX.utils.encode_cell({ r: R, c: 3 }); // Attendance column (D)
      const attendanceValue = summarySheet[attendanceCell]?.v;
      
      if (attendanceValue === "LWP") {
        applyCellStyle(summarySheet[attendanceCell], true);
      } else if (attendanceValue === "Present") {
        applyCellStyle(summarySheet[attendanceCell], false);
      }
    }
    
    // Set column widths for better formatting
    summarySheet['!cols'] = [
      { width: 15 }, // Date
      { width: 25 }, // Name
      { width: 20 }, // Duty
      { width: 18 }  // Attendance
    ];
    
    XLSX.utils.book_append_sheet(wb, summarySheet, "Attendance Summary");

    const payrollSheet = XLSX.utils.json_to_sheet(payroll);
    XLSX.utils.book_append_sheet(wb, payrollSheet, "Payroll Summary");

    XLSX.writeFile(wb, `Summary_${month}.xlsx`);
  };

  return (
    <div className="p-6 w-full space-y-6 text-white">
      <h1 className="text-2xl font-bold text-white">Employee Attendance & Payroll</h1>

      {/* Upload employee info */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="font-semibold text-white mb-3">1. Upload Employee Info</h2>
        <div className="flex items-center space-x-3">
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={handleFileUpload}
            className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-700 file:text-white hover:file:bg-red-600 file:transition-colors cursor-pointer"
          />
        </div>
      </div>

      {/* Attendance marking */}
      {employees.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h2 className="font-semibold text-white mb-3">2. Mark Attendance</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-600 p-2 rounded bg-gray-700 text-white focus:outline-none focus:border-red-500"
          />
          <table className="table-auto border border-gray-600 w-full mt-3 bg-gray-700">
            <thead>
              <tr className="bg-gray-600">
                <th className="border border-gray-500 px-3 py-2 text-white">Name</th>
                <th className="border border-gray-500 px-3 py-2 text-white">Duty</th>
                <th className="border border-gray-500 px-3 py-2 text-white">Salary</th>
                <th className="border border-gray-500 px-3 py-2 text-white">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-600 transition-colors">
                  <td className="border border-gray-500 px-3 py-2 text-white">{emp.name}</td>
                  <td className="border border-gray-500 px-3 py-2 text-white">{emp.duty}</td>
                  <td className="border border-gray-500 px-3 py-2 text-white">₹{emp.salary}</td>
                  <td className="border border-gray-500 px-3 py-2">
                    <select
                      value={attendance[emp.id] || "Present"}
                      onChange={(e) =>
                        markAttendance(emp.id, e.target.value)
                      }
                      className="bg-gray-600 text-white border border-gray-500 rounded px-2 py-1 focus:outline-none focus:border-red-500"
                    >
                      <option value="Present">Present</option>
                      <option value="LWP">LWP</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 space-x-3">
            <button
              onClick={saveAttendance}
              className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Save Attendance
            </button>
            <button
              onClick={exportDailyAttendance}
              className="px-4 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Export Daily Attendance
            </button>
            <button
              onClick={generateMonthlySummary}
              className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Generate Monthly Summary
            </button>
          </div>
        </div>
      )}

      {/* Past Attendance Records */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="font-semibold text-white mb-4">3. Past Attendance Records</h2>
        
        {/* Past Attendance Summary */}
        <div className="mb-4">
          {Object.keys(pastAttendance).length === 0 ? (
            <p className="text-gray-300">No records yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(pastAttendance).sort().reverse().map((date) => {
                const stats = getAttendanceStats(date);
                return (
                  <div key={date} className="border border-gray-600 rounded-lg p-4 bg-gray-700 hover:bg-gray-600 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-white">{date}</h3>
                      <button
                        onClick={() => {
                          setViewPastDate(date);
                          setShowPastViewer(true);
                        }}
                        className="px-3 py-1 bg-red-700 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors duration-200"
                      >
                        View Details
                      </button>
                    </div>
                    {stats && (
                      <div className="text-sm text-gray-300">
                        <p>Total: {stats.total} | Present: {stats.present} | LWP: {stats.lwp}</p>
                        <p>Attendance Rate: {Math.round((stats.present / stats.total) * 100)}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Attendance Viewer */}
        {showPastViewer && viewPastDate && pastAttendance[viewPastDate] && (
          <div className="border border-gray-600 rounded-lg p-6 bg-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Attendance Details - {viewPastDate}</h3>
              <div className="space-x-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-500 p-2 rounded bg-gray-600 text-white text-sm focus:outline-none focus:border-red-500"
                >
                  <option value="All">All</option>
                  <option value="Present">Present</option>
                  <option value="LWP">LWP</option>
                </select>
                <button
                  onClick={exportPastAttendance}
                  className="px-4 py-2 bg-green-700 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors duration-200"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowPastViewer(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-500 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Attendance Statistics */}
            {(() => {
              const stats = getAttendanceStats(viewPastDate);
              return stats && (
                <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-600 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                    <div className="text-sm text-gray-300">Total Employees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.present}</div>
                    <div className="text-sm text-gray-300">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.lwp}</div>
                    <div className="text-sm text-gray-300">LWP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {Math.round((stats.present / stats.total) * 100)}%
                    </div>
                    <div className="text-sm text-gray-300">Attendance Rate</div>
                  </div>
                </div>
              );
            })()}

            {/* Attendance Table */}
            <table className="table-auto border border-gray-500 w-full bg-gray-600">
              <thead>
                <tr className="bg-gray-500">
                  <th className="border border-gray-400 px-3 py-2 text-white">Name</th>
                  <th className="border border-gray-400 px-3 py-2 text-white">Duty</th>
                  <th className="border border-gray-400 px-3 py-2 text-white">Salary</th>
                  <th className="border border-gray-400 px-3 py-2 text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredEmployees().map((emp) => {
                  const status = getAttendanceStatus(pastAttendance[viewPastDate], emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-500 transition-colors">
                      <td className="border border-gray-400 px-3 py-2 text-white">{emp.name}</td>
                      <td className="border border-gray-400 px-3 py-2 text-white">{emp.duty}</td>
                      <td className="border border-gray-400 px-3 py-2 text-white">₹{emp.salary}</td>
                      <td className="border border-gray-400 px-3 py-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          status === "Present" 
                            ? "bg-green-600 text-white" 
                            : "bg-red-600 text-white"
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
