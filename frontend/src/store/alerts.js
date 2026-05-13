// Simple in-memory alert store — no external dependencies
// Alerts persist for the browser session, cleared on refresh

const _alerts = []
const _listeners = new Set()

export function addAlert(type, message, stanza = null) {
  const alert = {
    id:      Date.now(),
    type,        // 'error' | 'warning' | 'info' | 'success'
    message,
    stanza,
    ts: new Date().toISOString(),
  }
  _alerts.unshift(alert)
  if (_alerts.length > 100) _alerts.pop()
  _listeners.forEach(fn => fn([..._alerts]))
  return alert
}

export function getAlerts() { return [..._alerts] }

export function clearAlerts() {
  _alerts.length = 0
  _listeners.forEach(fn => fn([]))
}

export function subscribeAlerts(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
