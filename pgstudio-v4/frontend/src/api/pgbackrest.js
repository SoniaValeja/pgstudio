import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', timeout: 30000 })

// pgBackRest info
export const fetchInfo     = (stanza) => api.get('/pgbackrest/info', { params: stanza ? { stanza } : {} }).then(r => r.data)
export const fetchStanzas  = ()       => api.get('/pgbackrest/stanzas').then(r => r.data)

// config
export const fetchConfig   = ()        => api.get('/config').then(r => r.data)
export const saveConfigRaw = (content) => api.post('/config/raw', { content }).then(r => r.data)

// backup management
export const triggerBackup = (stanza, type) => api.post('/manage/backup', { stanza, type }).then(r => r.data)
export const fetchJobs     = ()        => api.get('/manage/jobs').then(r => r.data)
export const fetchJob      = (id)      => api.get(`/manage/jobs/${id}`).then(r => r.data)
export const createStanza  = (stanza)  => api.post('/manage/stanza/create', { stanza }).then(r => r.data)
export const deleteStanza  = (stanza, force) => api.post('/manage/stanza/delete', { stanza, force }).then(r => r.data)
export const verifyBackup  = (stanza)  => api.post('/manage/verify', { stanza }).then(r => r.data)
export const browseBackups = (stanza)  => api.get('/manage/browse', { params: stanza ? { stanza } : {} }).then(r => r.data)
