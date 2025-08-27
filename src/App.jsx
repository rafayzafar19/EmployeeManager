import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import AttendancePayroll from './components/AttendancePayroll'

function App() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <Navbar />
      <div className="pt-16">
        <AttendancePayroll />  
      </div>
    </div>
  )
}

export default App
