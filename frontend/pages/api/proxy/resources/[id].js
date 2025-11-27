import fetch from 'node-fetch'

export default async function handler(req, res){
  const { id } = req.query
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/resources/${id}/download`
  const headers = {}
  if(req.headers.authorization) headers['authorization'] = req.headers.authorization
  try{
    const r = await fetch(apiUrl, { headers, method: 'GET' })
    if(!r.ok){ res.status(r.status).end(await r.text()); return }
    res.setHeader('content-type', r.headers.get('content-type') || 'application/octet-stream')
    const disposition = r.headers.get('content-disposition')
    if(disposition) res.setHeader('content-disposition', disposition)
    const body = await r.buffer()
    res.status(200).send(body)
  }catch(err){ res.status(500).json({ error: 'proxy error' }) }
}
