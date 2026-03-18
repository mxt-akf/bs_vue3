import request from '@/utils/request'

// 查询订单列表
export function listExchangeOrder(query) {
  return request({ url: '/exchange/order/list', method: 'get', params: query })
}

// 查询订单详情
export function getExchangeOrder(orderId) {
  return request({ url: `/exchange/order/${orderId}`, method: 'get' })
}

// 发起交换申请
export function applyExchange(data) {
  return request({ url: '/exchange/order/apply', method: 'post', data })
}

// 接受申请
export function acceptApply(orderId) {
  return request({ url: `/exchange/order/${orderId}/accept`, method: 'put' })
}

// 拒绝申请
export function rejectApply(orderId, cancelReason) {
  return request({ url: `/exchange/order/${orderId}/reject`, method: 'put', data: { cancelReason } })
}

// 提交目标方估值
export function submitEvaluate(orderId, targetValue) {
  return request({ url: `/exchange/order/${orderId}/evaluate`, method: 'put', data: { targetValue } })
}

// 提交管理员审核
export function submitToAudit(orderId) {
  return request({ url: `/exchange/order/${orderId}/submit-audit`, method: 'put' })
}

// 管理员审核通过
export function auditPass(orderId, auditRemark) {
  return request({ url: `/exchange/order/${orderId}/audit/pass`, method: 'put', data: { auditRemark } })
}

// 管理员审核驳回
export function auditReject(orderId, auditRemark) {
  return request({ url: `/exchange/order/${orderId}/audit/reject`, method: 'put', data: { auditRemark } })
}

// 确认履约完成
export function confirmFulfill(orderId) {
  return request({ url: `/exchange/order/${orderId}/fulfill`, method: 'put' })
}

// 取消订单
export function cancelOrder(orderId, cancelReason) {
  return request({ url: `/exchange/order/${orderId}/cancel`, method: 'put', data: { cancelReason } })
}