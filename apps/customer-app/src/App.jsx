import React, { useEffect, useState } from 'react'
import { getStatus } from './api'

export default function App() {
  const [status, setStatus] = useState('...')

  useEffect(() => {
    getStatus().then(s => setStatus(s)).catch(() => setStatus('offline'))
  }, [])

  return (
    <div style={{padding:20,fontFamily:'sans-serif'}}>
      <h1>Customer App</h1>
      <p>Backend status: {status}</p>
      <p>Use this app to request rides and view bookings.</p>
    </div>
  )
}
