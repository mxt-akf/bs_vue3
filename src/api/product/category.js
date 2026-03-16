import request from '@/utils/request'

// 查询分类列表
export function listCategory(query) {
  return request({
    url: '/product/category/list',
    method: 'get',
    params: query
  })
}

// 查询分类详细
export function getCategory(categoryId) {
  return request({
    url: '/product/category/' + categoryId,
    method: 'get'
  })
}

// 新增分类
export function addCategory(data) {
  return request({
    url: '/product/category',
    method: 'post',
    data: data
  })
}

// 修改分类
export function updateCategory(data) {
  return request({
    url: '/product/category',
    method: 'put',
    data: data
  })
}

// 删除分类（支持单个和批量删除）
// 参数可以是: 数字 1、字符串 "1"、数组 [1,2,3] 或字符串 "1,2,3"
export function delCategory(categoryIds) {
  // 统一处理成逗号分隔的字符串
  let ids = categoryIds
  if (Array.isArray(categoryIds)) {
    ids = categoryIds.join(',')
  }
  return request({
    url: '/product/category/' + ids,
    method: 'delete'
  })
}
