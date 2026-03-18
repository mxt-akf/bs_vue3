<template>
  <div class="app-container">

    <!-- 搜索区域 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="订单编号" prop="orderNo">
        <el-input v-model="queryParams.orderNo" placeholder="请输入订单编号" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="订单状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 130px">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="交换方式" prop="exchangeType">
        <el-select v-model="queryParams.exchangeType" placeholder="请选择" clearable style="width: 120px">
          <el-option label="以物换物" value="item" />
          <el-option label="积分置换" value="points" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="dateRange">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="-" start-placeholder="开始日期"
          end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 220px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="orderList" border>
      <el-table-column label="订单编号" align="center" prop="orderNo" width="200" />
      <el-table-column label="目标物品" align="center" prop="targetProductName" :show-overflow-tooltip="true" />
      <el-table-column label="发起人" align="center" prop="initiatorName" width="100" />
      <el-table-column label="交换方式" align="center" width="100">
        <template #default="{ row }">
          <el-tag :type="row.exchangeType === 'item' ? 'primary' : 'warning'" size="small">
            {{ row.exchangeType === 'item' ? '以物换物' : '积分置换' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提供物品/积分" align="center" :show-overflow-tooltip="true">
        <template #default="{ row }">
          <span v-if="row.exchangeType === 'item'">{{ row.offerProductName || '-' }}</span>
          <span v-else class="points-text">{{ row.offerPoints }} 积分</span>
        </template>
      </el-table-column>
      <el-table-column label="发起方估值" align="center" width="110">
        <template #default="{ row }">
          <span v-if="row.initiatorValue">￥{{ row.initiatorValue }}</span>
          <span v-else class="text-gray">未填写</span>
        </template>
      </el-table-column>
      <el-table-column label="订单状态" align="center" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="{ row }">{{ parseTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="250" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canCancel(row.status)" link type="danger" icon="CircleClose" @click="handleCancel(row)"
            v-hasPermi="['exchange:order:cancel']">取消</el-button>
          <el-button v-if="row.status === 'CONFIRMED'" link type="warning" icon="Check" @click="handleToAudit(row)"
            v-hasPermi="['exchange:order:audit']">提交审核</el-button>
          <el-button link type="primary" icon="View" @click="handleDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 取消原因弹窗 -->
    <el-dialog v-model="cancelDialog.visible" title="取消订单" width="400px" append-to-body>
      <el-form :model="cancelDialog" label-width="80px">
        <el-form-item label="取消原因">
          <el-input v-model="cancelDialog.reason" type="textarea" :rows="3" placeholder="请填写取消原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelDialog.visible = false">返 回</el-button>
        <el-button type="danger" :loading="cancelDialog.loading" @click="submitCancel">确认取消</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup name="ExchangeOrderList">
import { listExchangeOrder, cancelOrder } from '@/api/product/exchange'
import { useRouter } from 'vue-router'

const { proxy } = getCurrentInstance()
const router = useRouter()

const orderList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const dateRange = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderNo: undefined,
  status: undefined,
  exchangeType: undefined
})

const cancelDialog = reactive({
  visible: false,
  loading: false,
  orderId: null,
  reason: ''
})

// 状态配置
const statusOptions = [
  { value: 'PENDING', label: '待确认' },
  { value: 'EVALUATING', label: '估值中' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'AUDITING', label: '审核中' },
  { value: 'FULFILLING', label: '履约中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'DISPUTED', label: '争议中' }
]

const statusTypeMap = {
  PENDING: 'info',
  EVALUATING: 'warning',
  CONFIRMED: 'primary',
  AUDITING: 'warning',
  FULFILLING: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  DISPUTED: 'danger'
}

function getStatusLabel(status) {
  return statusOptions.find(s => s.value === status)?.label || status
}

function getStatusType(status) {
  return statusTypeMap[status] || 'info'
}

function canCancel(status) {
  return ['PENDING', 'EVALUATING'].includes(status)
}

function getList() {
  loading.value = true
  const params = { ...queryParams }
  if (dateRange.value?.length === 2) {
    params['params[beginTime]'] = dateRange.value[0]
    params['params[endTime]'] = dateRange.value[1]
  }
  listExchangeOrder(params).then(res => {
    orderList.value = res.rows
    total.value = res.total
  }).finally(() => { loading.value = false })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  dateRange.value = []
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleDetail(row) {
  router.push(`/exchange/detail/${row.orderId}`)
}

function handleCancel(row) {
  cancelDialog.orderId = row.orderId
  cancelDialog.reason = ''
  cancelDialog.visible = true
}

function submitCancel() {
  if (!cancelDialog.reason.trim()) {
    proxy.$modal.msgWarning('请填写取消原因')
    return
  }
  cancelDialog.loading = true
  cancelOrder(cancelDialog.orderId, cancelDialog.reason).then(() => {
    proxy.$modal.msgSuccess('订单已取消')
    cancelDialog.visible = false
    getList()
  }).finally(() => { cancelDialog.loading = false })
}

// 提交管理员审核（CONFIRMED → AUDITING，后端单独处理或直接在详情页操作）
function handleToAudit(row) {
  proxy.$modal.confirm(`确认将订单「${row.orderNo}」提交管理员审核？`).then(() => {
    // TODO: 后续补充提交审核接口，目前跳转详情页操作
    router.push(`/exchange/detail/${row.orderId}`)
  }).catch(() => { })
}

getList()
</script>

<style scoped lang="scss">
.points-text {
  color: var(--el-color-warning);
  font-weight: 500;
}

.text-gray {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>