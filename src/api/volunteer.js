import request from '@/utils/request'

// ===== 志愿者申请 =====
export function getMyVolunteerInfo() {
  return request({ url: '/volunteer/myInfo', method: 'get' })
}

export function applyVolunteer(data) {
  return request({ url: '/volunteer/apply', method: 'post', data })
}

export function listVolunteer(query) {
  return request({ url: '/volunteer/list', method: 'get', params: query })
}

export function auditVolunteer(data) {
  return request({ url: '/volunteer/audit', method: 'put', data })
}

// ===== 任务 =====
export function listTaskBoard(query) {
  return request({ url: '/volunteer/task/board', method: 'get', params: query })
}

export function listTask(query) {
  return request({ url: '/volunteer/task/list', method: 'get', params: query })
}

export function addTask(data) {
  return request({ url: '/volunteer/task', method: 'post', data })
}

export function updateTask(data) {
  return request({ url: '/volunteer/task', method: 'put', data })
}

export function delTask(taskIds) {
  return request({ url: '/volunteer/task/' + taskIds, method: 'delete' })
}

export function claimTask(taskId) {
  return request({ url: `/volunteer/task/claim/${taskId}`, method: 'put' })
}

export function submitTask(taskId, data) {
  return request({ url: `/volunteer/task/submit/${taskId}`, method: 'put', data })
}

export function getTaskRecord(taskId) {
  return request({ url: `/volunteer/task/record/${taskId}`, method: 'get' })
}

export function listMyRecords(query) {
  return request({ url: '/volunteer/task/myRecords', method: 'get', params: query })
}