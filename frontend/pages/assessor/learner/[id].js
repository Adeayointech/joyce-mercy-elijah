import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import api from '../../../utils/api'
import toast from '../../../utils/toast'
import RequireAuth from '../../../components/RequireAuth'

function FeedbackForm({ assignmentId, onAdded }){
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  async function submit(e){
    e && e.preventDefault()
    if(!text) return toast('Please enter feedback', 'error')
    setLoading(true)
    let resp
    try{
      const fd = new FormData()
      fd.append('comment', text)
      if(file) fd.append('file', file)
      resp = await api.post(`/assignments/${assignmentId}/feedback`, fd, true)
    }catch(e){ resp = { ok: false } }
    setLoading(false)
    if(resp.ok){ setText(''); if(onAdded) onAdded(); toast('Feedback sent', 'success') }
    else { const d = await resp.json(); toast(d.error||'Failed to send feedback', 'error') }
  }
  return (
    <form onSubmit={submit} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <input placeholder="Add feedback" value={text} onChange={e=>setText(e.target.value)} style={{ width: 220 }} />
      <input type="file" onChange={e=>setFile(e.target.files[0])} />
      <button className="btn-approve" type="submit" disabled={loading}>{loading? '...' : 'Send'}</button>
    </form>
  )
}

export default function LearnerDetail(){
  const router = useRouter()
  const { id } = router.query
  const [assignments, setAssignments] = useState([])

  useEffect(()=>{ if(id) fetchAssignments() }, [id])

  async function fetchAssignments(){
    const resp = await api.get(`/users/${id}/assignments`)
    const d = await resp.json()
    if(resp.ok) setAssignments(d)
    else toast(d.error||'Failed to load')
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

  async function downloadFeedback(feedbackId, filename){
    try{
      const token = localStorage.getItem('token')
      const resp = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000') + `/feedback/${feedbackId}/download`, { headers: { 'Authorization': 'Bearer ' + token } })
      if(!resp.ok) return toast('Download failed', 'error')
      const blob = await resp.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename || 'file'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    }catch(err){ toast('Download failed', 'error') }
  }

  return (
    <RequireAuth role="assessor">
      <div>
        <h2>Learner Submissions</h2>
        <p className="muted">Showing submissions for learner id: {id}</p>
        <section className="card">
          <h3>Assignments</h3>
          <table>
            <thead>
              <tr><th>Title</th><th>Uploaded</th><th>Actions</th></tr>
            </thead>
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
                          {a.feedback.map(f=> (
                            <li key={f.id}>
                              <em>{f.assessor_name}</em>: {f.comment}
                              {f.filename && (<><br/><a href="#" onClick={(e)=>{ e.preventDefault(); downloadFeedback(f.id, f.filename) }}>Download corrected file</a></>)}
                              <div className="muted">{new Date(f.created_at).toLocaleString()}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="muted">{a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : ''}</td>
                  <td>
                    <div className="actions">
                      <a href="#" onClick={e=>{ e.preventDefault(); downloadAssignment(a.id, a.filename) }}>Download</a>
                      <FeedbackForm assignmentId={a.id} onAdded={fetchAssignments} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </RequireAuth>
  )
}
