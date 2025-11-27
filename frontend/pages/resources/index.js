import { useEffect, useState } from 'react'
import api from '../../utils/api'
import toast from '../../utils/toast'

export default function Resources(){
  const [resources, setResources] = useState([])

  useEffect(()=>{ fetchResources() }, [])

  async function fetchResources(){
    const resp = await api.get('/resources')
    const d = await resp.json()
    if(resp.ok) setResources(d)
  }

  function groupBy(arr, key){
    return arr.reduce((acc, item)=>{ (acc[item[key]] = acc[item[key]] || []).push(item); return acc }, {})
  }

  async function downloadResource(id, filename){
    try{
      const token = localStorage.getItem('token')
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + `/resources/${id}/download`, { headers: { 'Authorization': 'Bearer ' + token } })
      if(!resp.ok) return toast('Download failed: ' + (await resp.text()), 'error')
      const blob = await resp.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename || 'resource'
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    }catch(err){ toast('Download failed', 'error') }
  }

  return (
    <div>
      <h2>Resources</h2>
      {resources.length===0 ? <p>No resources available.</p> : (
        (()=>{
          const grouped = groupBy(resources, 'type')
          return Object.keys(grouped).map(type => (
            <section key={type} className="card">
              <h3>{type.toUpperCase()}</h3>
              <ul>
                {grouped[type].map(r => (
                  <li key={r.id}>{r.title} — <a href="#" onClick={e=>{e.preventDefault(); downloadResource(r.id, r.filename)}}>Download</a></li>
                ))}
              </ul>
            </section>
          ))
        })()
      )}
    </div>
  )
}
