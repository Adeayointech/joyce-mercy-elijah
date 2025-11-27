import { useState } from 'react'
import api from './utils/api'

export default function Forgot(){
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e){
    e.preventDefault();
    setMsg('')
    try{
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + '/auth/request-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const d = await resp.json()
      if(resp.ok) setMsg('Reset token (dev): ' + (d.resetToken || 'sent'))
      else setMsg(d.error || 'error')
    }catch(err){ setMsg('network error') }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Forgot Password</h2>
      <form onSubmit={submit}>
        <div><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your email" /></div>
        <div><button type="submit">Request Reset</button></div>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  )
}
