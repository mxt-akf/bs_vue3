import request from '@/utils/request'

export function listProductInfo(query) {
  return request({
    url: '/product/info/list',
    method: 'get',
    params: query
  })
}

export function getProductInfo(productId) {
  return request({
    url: '/product/info/' + productId,
    method: 'get'
  })
}

export function addProductInfo(data) {
  return request({
    url: '/product/info',
    method: 'post',
    data: data
  })
}

export function updateProductInfo(data) {
  return request({
    url: '/product/info',
    method: 'put',
    data: data
  })
}

export function delProductInfo(productIds) {
  return request({
    url: '/product/info/' + productIds,
    method: 'delete'
  })
}