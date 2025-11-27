import { useEffect, useState } from 'react'
import api from '../../utils/api'
import toast from '../../utils/toast'
import RequireAuth from '../../components/RequireAuth'

function LearnerDashboard(){
  const [assignments, setAssignments] = useState([])
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(()=>{ fetchAssignments() }, [])

  async function fetchAssignments(){
    const resp = await api.get('/assignments/my')
    const data = await resp.json()
    if(resp.ok) setAssignments(data)
  }

  async function downloadFeedback(feedbackId, filename){
    try{
      const token = localStorage.getItem('token')
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + `/feedback/${feedbackId}/download`, { headers: { 'Authorization': 'Bearer ' + token } })
      if(!resp.ok) return toast('Download failed', 'error')
      const blob = await resp.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }catch(err){ toast('Download failed', 'error') }
  }

  async function downloadAssignment(id, filename){
    try{
      const token = localStorage.getItem('token')
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + `/assignments/${id}/download`, { headers: { 'Authorization': 'Bearer ' + token } })
      if(!resp.ok) return toast('Download failed', 'error')
      const blob = await resp.blob(); const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename || 'assignment'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    }catch(err){ toast('Download failed', 'error') }
  }

  async function deleteAssignment(id){
    if(!confirm('Delete this submission? This cannot be undone.')) return
    try{
      const token = localStorage.getItem('token')
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + `/assignments/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
      if(!resp.ok) return toast('Delete failed', 'error')
      toast('Submission deleted', 'success')
      fetchAssignments()
    }catch(err){ toast('Delete failed', 'error') }
  }

  async function submit(e){
    e.preventDefault();
    if(!file) return toast('Select a file to upload', 'error')
    const fd = new FormData();
    fd.append('file', file)
    fd.append('title', title)
    fd.append('description', desc)
    const resp = await api.post('/assignments/upload', fd, true)
    if(resp.ok){ setFile(null); setTitle(''); setDesc(''); fetchAssignments(); toast('Upload successful', 'success') }
    else { const d = await resp.json(); toast(d.error||'Upload failed', 'error') }
  }

  return (
    <div>
      <h2>Learner Dashboard</h2>
      <p><a href="/resources">Browse Resources</a></p>
      <section>
        <h3>Upload Assignment</h3>
        <form onSubmit={submit}>
          <div><input type="text" placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} /></div>
          <div><input type="text" placeholder="description" value={desc} onChange={e=>setDesc(e.target.value)} /></div>
          <div><input type="file" onChange={e=>setFile(e.target.files[0])} /></div>
          <div><button type="submit">Upload</button></div>
        </form>
      </section>

      <section>
        <h3>My Assignments</h3>
        <div className="card">
          {assignments.length === 0 && <p className="muted">No uploads yet</p>}
          <table>
            <thead><tr><th>Title</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.title || a.filename}</div>
                    <div className="muted">{a.description}</div>
                    {a.feedback && a.feedback.length>0 && (
                      <div style={{ marginTop: 8 }}>
                        <strong>Feedback:</strong>
                        <ul>
                        {a.feedback.map(f=> <li key={f.id}><em>{f.assessor_name}</em>: {f.comment} {f.filename && (<><br/><a href="#" onClick={(e)=>{e.preventDefault(); downloadFeedback(f.id, f.filename)}}>Download corrected file</a></>)} <span className="muted">({new Date(f.created_at).toLocaleString()})</span></li>)}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="muted">{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : ''}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a href="#" onClick={e=>{ e.preventDefault(); downloadAssignment(a.id, a.filename) }}>Download</a>
                      <a href="#" style={{ color: '#c33' }} onClick={e=>{ e.preventDefault(); deleteAssignment(a.id) }}>Delete</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default function Page(){
  return (
    <RequireAuth role="learner">
      <LearnerDashboard />
    </RequireAuth>
  )
}
