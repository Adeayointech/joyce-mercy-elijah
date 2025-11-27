const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

function authHeaders(extra={}){
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = Object.assign({ }, extra)
  if(token) headers['Authorization'] = 'Bearer ' + token
  return headers
}

export default {
  get: (path) => fetch(BASE + path, { headers: authHeaders() }),
  post: (path, body, isForm=false) => {
    if(isForm) return fetch(BASE + path, { method: 'POST', body, headers: authHeaders() })
    return fetch(BASE + path, { method: 'POST', body: JSON.stringify(body), headers: authHeaders({ 'Content-Type': 'application/json' }) }).then(resp=>{
      // if posting to endpoints that affect pending users, update local pendingCount cache
      try{
        if(path.includes('/users/') && (path.includes('/approve') || path.includes('/decline'))){
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if(token){ fetch(BASE + '/users/pending', { headers: { 'Authorization': 'Bearer '+token } }).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) localStorage.setItem('pendingCount', String(d.length)) }).catch(()=>{}) }
        }
      }catch(e){}
      return resp
    })
  }
}
