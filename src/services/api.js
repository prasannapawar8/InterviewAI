const API_URL = import.meta.env.VITE_API_URL || '/api'

let accessToken = null

export function setAccessToken(token) {
  accessToken = token || null
}

export function getAccessToken() {
  return accessToken
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

async function parseError(res) {
  let message = `Request failed (${res.status})`
  let code
  try {
    const data = await res.json()
    if (data.error) message = data.error
    if (data.code) code = data.code
    if (data.details) message = `${message}: ${Object.values(data.details).join(', ')}`
  } catch {
    /* non-JSON */
  }
  const err = new Error(message)
  err.status = res.status
  err.code = code
  return err
}

async function request(path, { method = 'GET', body, formData, headers = {}, retry = true } = {}) {
  const opts = { method, headers: { ...headers }, credentials: 'include' }
  if (accessToken) opts.headers.Authorization = `Bearer ${accessToken}`
  if (formData) {
    opts.body = formData
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, opts)
  if (res.status === 401 && retry && path !== '/auth/refresh' && path !== '/auth/login') {
    const ok = await authService.refresh()
    if (ok) return request(path, { method, body, formData, headers, retry: false })
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res
}

function uploadWithProgress(formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/analyses`)
    xhr.withCredentials = true
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* empty */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new Error(data.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

export const authService = {
  async login({ email, password }) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password }, retry: false })
    setAccessToken(data.token)
    return { ...data.user, token: data.token }
  },

  async register({ name, email, password, orgName }) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: { name, email, password, orgName },
      retry: false,
    })
    setAccessToken(data.token)
    return { ...data.user, token: data.token }
  },

  async refresh() {
    try {
      const data = await request('/auth/refresh', { method: 'POST', retry: false })
      setAccessToken(data.token)
      return data
    } catch {
      setAccessToken(null)
      return null
    }
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST', retry: false })
    } finally {
      setAccessToken(null)
    }
  },

  async forgotPassword({ email }) {
    return request('/auth/forgot-password', { method: 'POST', body: { email } })
  },

  async resetPassword({ token, password }) {
    return request('/auth/reset-password', { method: 'POST', body: { token, password }, retry: false })
  },

  async switchOrg(orgId) {
    const data = await request('/auth/switch-org', { method: 'POST', body: { orgId } })
    setAccessToken(data.token)
    return { ...data.user, token: data.token }
  },

  async updateProfile(patch) {
    const data = await request('/users/me', { method: 'PATCH', body: patch })
    return data.user
  },

  async changePassword({ current, next }) {
    return request('/users/me/password', { method: 'POST', body: { current, next } })
  },

  async me() {
    return request('/users/me')
  },
}

export const dashboardService = {
  getStats: () => request('/dashboard/stats'),
  getOverview: () => request('/dashboard/overview'),
  getRecentAnalyses: (limit = 6) => request(`/dashboard/recent?limit=${limit}`),
}

export const orgService = {
  get: () => request('/orgs/me'),
  update: (patch) => request('/orgs/me', { method: 'PATCH', body: patch }),
  invite: ({ email, role }) => request('/orgs/me/invites', { method: 'POST', body: { email, role } }),
  listInvites: () => request('/orgs/me/invites'),
  acceptInvite: (token) => request('/orgs/invites/accept', { method: 'POST', body: { token } }),
}

export const billingService = {
  usage: () => request('/billing/usage'),
  checkout: () => request('/billing/checkout', { method: 'POST' }),
}

export const analysisService = {
  getResult(id) {
    if (!id) return Promise.reject(new Error('Analysis id is required'))
    return request(`/analyses/${id}`)
  },

  async listAnalyses(limit = 20) {
    const data = await request(`/analyses${limit ? `?limit=${limit}` : ''}`)
    return data.items
  },

  async upload(file, { onProgress, candidate, role, candidateConsent } = {}) {
    const formData = new FormData()
    formData.append('file', file)
    if (candidate) formData.append('candidate', candidate)
    if (role) formData.append('role', role)
    formData.append('candidateConsent', candidateConsent ? 'true' : 'false')
    return uploadWithProgress(formData, { onProgress })
  },

  getStatus(id) {
    return request(`/analyses/${id}/status`)
  },

  retry(id) {
    return request(`/analyses/${id}/retry`, { method: 'POST' })
  },

  async processInterview({ analysisId, onProgress, onStep, steps }) {
    if (!analysisId) throw new Error('analysisId is required')
    const stageIndex = (stage) => {
      const i = steps.findIndex((s) => s.key === stage)
      return i < 0 ? 0 : i
    }
    for (;;) {
      await delay(900)
      const s = await this.getStatus(analysisId)
      onStep?.(stageIndex(s.stage))
      onProgress?.(s.progress ?? 0)
      if (s.status === 'Completed') {
        onProgress?.(100)
        return { ok: true, resultId: analysisId }
      }
      if (s.status === 'Failed') {
        throw new Error(s.error || 'Processing failed — please try again')
      }
    }
  },

  async downloadReport(id) {
    const res = await fetch(`${API_URL}/analyses/${id}/report.pdf`, {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!res.ok) {
      let message = `Download failed (${res.status})`
      try {
        const data = await res.json()
        if (data.error) message = data.error
      } catch {
        /* not JSON */
      }
      throw new Error(message)
    }
    return res.blob()
  },
}
