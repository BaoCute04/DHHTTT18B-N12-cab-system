import React, { useEffect, useState } from 'react'
import { getStatus } from './api'

export default function App() {
  const [status, setStatus] = useState('...')

  useEffect(() => {
    getStatus().then(s => setStatus(s)).catch(() => setStatus('offline'))
  }, [])

  return (
    <div style={{padding:20,fontFamily:'sans-serif'}}>
      <h1>Admin Dashboard</h1>
      <p>Backend status: {status}</p>
      <p>Use this dashboard for monitoring and admin tasks.</p>
    </div>
  )
}
