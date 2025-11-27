import { useState } from 'react'

export default function Reset(){
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e){
    e.preventDefault(); setMsg('')
    try{
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + '/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) })
      const d = await resp.json()
      if(resp.ok) setMsg('Password reset. You can now login.')
      else setMsg(d.error || 'error')
    }catch(err){ setMsg('network error') }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Reset Password</h2>
      <form onSubmit={submit}>
        <div><input value={token} onChange={e=>setToken(e.target.value)} placeholder="reset token" /></div>
        <div><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="new password" /></div>
        <div><button type="submit">Set Password</button></div>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  )
}
