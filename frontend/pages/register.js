import { useState } from 'react'
import { useRouter } from 'next/router'
import api from '../utils/api'

export default function Register(){
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [body, setBody] = useState('NCFE')
  const [level, setLevel] = useState(3)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  async function submit(e){
    e.preventDefault();
    setMsg('')
    try{
      const resp = await api.post('/auth/register', { name, email, password, awarding_body: body, level })
      const data = await resp.json()
      if(resp.ok) setMsg('Registered — await approval')
      else setMsg(data.error || 'Registration failed')
    }catch(err){ setMsg('Network error') }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2>Register</h2>
      <form onSubmit={submit} className="card">
        <div className="form-row">
          <label>Name</label><br />
          <input value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Email</label><br />
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Password</label><br />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Awarding Body</label><br />
          <select value={body} onChange={e=>setBody(e.target.value)}>
            <option value="NCFE">NCFE</option>
            <option value="FOCUS">FOCUS</option>
            <option value="PVG">PVG</option>
            <option value="HIGHFIELD">HIGHFIELD</option>
          </select>
        </div>
        <div className="form-row">
          <label>Level</label><br />
          <input type="number" min={1} max={10} value={level} onChange={e=>setLevel(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" className="btn-primary">Register</button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </form>
    </div>
  )
}
