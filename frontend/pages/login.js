import { useState } from 'react'
import { useRouter } from 'next/router'
import api from '../utils/api'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e){
    e.preventDefault();
    setError('')
    try{
      const resp = await api.post('/auth/login', { email, password })
      const data = await resp.json()
      if(resp.ok){
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        if(data.user.role === 'assessor') router.push('/assessor/dashboard')
        else router.push('/learner/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    }catch(err){ setError('Network error') }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label><br />
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label><br />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Login</button>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  )
}
