<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item prop="realName">
        <el-input v-model="queryParams.realName" placeholder="姓名搜索" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item prop="status">
        <el-select v-model="queryParams.status" placeholder="审核状态" clearable style="width: 120px">
          <el-option label="待审核" value="PENDING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已拒绝" value="REJECTED" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </div>

    <el-table v-loading="loading" :data="list" border>
      <el-table-column label="用户昵称"  prop="nickName"   align="center" />
      <el-table-column label="真实姓名"  prop="realName"   align="center" />
      <el-table-column label="联系电话"  prop="phone"      align="center" />
      <el-table-column label="申请理由"  prop="reason"     align="center" show-overflow-tooltip />
      <el-table-column label="状态"      align="center" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType[row.status]">{{ statusLabel[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间"  prop="createTime" align="center" width="160" />
      <el-table-column label="审核意见"  prop="auditRemark" align="center" show-overflow-tooltip />
      <el-table-column label="操作" align="center" width="180">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button type="success" link icon="Check"
              v-hasPermi="['volunteer:audit:approve']"
              @click="handleAudit(row, 'APPROVED')">通过</el-button>
            <el-button type="danger" link icon="Close"
              v-hasPermi="['volunteer:audit:reject']"
              @click="handleAudit(row, 'REJECTED')">拒绝</el-button>
          </template>
          <span v-else class="text-muted">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total"
      v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize"
      @pagination="getList" />

    <!-- 审核弹窗 -->
    <el-dialog :title="auditForm.status === 'APPROVED' ? '通过申请' : '拒绝申请'"
      v-model="auditVisible" width="420px" append-to-body>
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="审核意见">
          <el-input v-model="auditForm.auditRemark" type="textarea" :rows="3"
            :placeholder="auditForm.status === 'REJECTED' ? '请填写拒绝理由（选填）' : '通过备注（选填）'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取 消</el-button>
        <el-button :type="auditForm.status === 'APPROVED' ? 'success' : 'danger'"
          :loading="auditLoading" @click="submitAudit">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="VolunteerAudit">
import { listVolunteer, auditVolunteer } from '@/api/volunteer'

const { proxy } = getCurrentInstance()
const list = ref([])
const loading = ref(false)
const showSearch = ref(true)
const total = ref(0)
const auditVisible = ref(false)
const auditLoading = ref(false)

const statusLabel   = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝' }
const statusTagType = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }

const queryParams = reactive({ pageNum: 1, pageSize: 10, realName: undefined, status: undefined })
const auditForm   = reactive({ volunteerId: null, status: '', auditRemark: '' })

function getList() {
  loading.value = true
  listVolunteer(queryParams).then(res => {
    list.value  = res.rows
    total.value = res.total
  }).finally(() => { loading.value = false })
}

function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery()  { proxy.resetForm('queryRef'); handleQuery() }

function handleAudit(row, status) {
  auditForm.volunteerId  = row.volunteerId
  auditForm.status       = status
  auditForm.auditRemark  = ''
  auditVisible.value     = true
}

function submitAudit() {
  auditLoading.value = true
  auditVolunteer({ ...auditForm }).then(() => {
    proxy.$modal.msgSuccess('审核完成')
    auditVisible.value = false
    getList()
  }).finally(() => { auditLoading.value = false })
}

getList()
</script>
