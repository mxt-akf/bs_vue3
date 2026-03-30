<template>
  <div class="app-container">
    <!-- 顶部搜索 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item prop="title">
        <el-input v-model="queryParams.title" placeholder="搜索任务标题" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb8" style="display:flex; align-items:center">
      <el-button type="primary" plain @click="$router.push('/volunteer/apply')">
        {{ isApproved ? '✓ 已认证志愿者' : '申请成为志愿者' }}
      </el-button>
      <el-button v-if="isApproved" plain @click="showMyRecords = true">我的认领记录</el-button>
      <right-toolbar style="margin-left:auto" v-model:showSearch="showSearch" @queryTable="getList" />
    </div>

    <!-- 任务卡片列表 -->
    <el-row :gutter="16" v-loading="loading">
      <el-col v-for="task in taskList" :key="task.taskId" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="task-card" shadow="hover">
          <div class="task-header">
            <span class="task-title">{{ task.title }}</span>
            <el-tag type="success" size="small">待认领</el-tag>
          </div>
          <div class="task-desc">{{ task.description || '暂无描述' }}</div>
          <div class="task-meta">
            <span><el-icon><Coin /></el-icon> 奖励 <b style="color:#f59e0b">{{ task.pointsReward }}</b> 积分</span>
            <span v-if="task.deadline" style="color:#909399; font-size:12px">
              截止：{{ parseTime(task.deadline, '{y}-{m}-{d}') }}
            </span>
          </div>
          <el-button type="primary" size="small" style="width:100%; margin-top:12px"
            :disabled="!isApproved"
            :title="isApproved ? '' : '需先通过志愿者审核'"
            @click="handleClaim(task)">
            认领任务
          </el-button>
        </el-card>
      </el-col>
      <el-col v-if="!loading && taskList.length === 0" :span="24">
        <el-empty description="暂无待认领任务" />
      </el-col>
    </el-row>

    <pagination v-show="total > 0" :total="total"
      v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize"
      @pagination="getList" />

    <!-- 提交完成弹窗 -->
    <el-dialog title="提交任务完成" v-model="submitVisible" width="460px" append-to-body>
      <el-form ref="submitRef" :model="submitForm" :rules="submitRules" label-width="90px">
        <el-form-item label="服务时长" prop="serviceHours">
          <el-input-number v-model="submitForm.serviceHours" :min="0.5" :max="24"
            :step="0.5" :precision="1" controls-position="right" style="width:100%" />
          <div style="color:#909399; font-size:12px; margin-top:4px">单位：小时</div>
        </el-form-item>
        <el-form-item label="完成凭证" prop="proofImage">
          <image-upload v-model="submitForm.proofImage" :limit="1" />
        </el-form-item>
        <el-form-item label="完成说明" prop="summary">
          <el-input v-model="submitForm.summary" type="textarea" :rows="3"
            placeholder="请描述本次服务完成情况" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交完成</el-button>
      </template>
    </el-dialog>

    <!-- 我的记录抽屉 -->
    <el-drawer title="我的认领记录" v-model="showMyRecords" size="60%">
      <el-table :data="myRecords" border v-loading="recordsLoading">
        <el-table-column label="任务名称"   prop="taskTitle"    show-overflow-tooltip />
        <el-table-column label="积分奖励"   prop="pointsReward" width="90" align="center">
          <template #default="{ row }">
            <b style="color:#f59e0b">+{{ row.pointsReward }}</b>
          </template>
        </el-table-column>
        <el-table-column label="服务时长"  prop="serviceHours" width="100" align="center">
          <template #default="{ row }">{{ row.serviceHours ? row.serviceHours + 'h' : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'SUBMITTED' ? 'success' : 'warning'">
              {{ row.status === 'SUBMITTED' ? '已完成' : '认领中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="认领时间" prop="claimTime" width="160" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 'CLAIMED'" type="primary" link
              @click="openSubmit(row)">提交完成</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup name="VolunteerBoard">
import { Coin } from '@element-plus/icons-vue'
import { listTaskBoard, claimTask, submitTask, listMyRecords, getMyVolunteerInfo } from '@/api/volunteer'

const { proxy } = getCurrentInstance()
const taskList     = ref([])
const myRecords    = ref([])
const loading      = ref(false)
const recordsLoading = ref(false)
const total        = ref(0)
const isApproved   = ref(false)
const submitVisible  = ref(false)
const submitLoading  = ref(false)
const showMyRecords  = ref(false)

const queryParams = reactive({ pageNum: 1, pageSize: 12, title: undefined })

const submitForm = reactive({ taskId: null, serviceHours: 1, proofImage: '', summary: '' })
const submitRules = {
  serviceHours: [{ required: true, message: '请填写服务时长', trigger: 'blur' }],
  summary:      [{ required: true, message: '请填写完成说明', trigger: 'blur' }]
}

async function checkVolunteerStatus() {
  const res = await getMyVolunteerInfo()
  isApproved.value = res.data?.status === 'APPROVED'
}

function getList() {
  loading.value = true
  listTaskBoard(queryParams).then(res => {
    taskList.value = res.rows
    total.value    = res.total
  }).finally(() => { loading.value = false })
}

function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery()  { proxy.resetForm('queryRef'); handleQuery() }

function handleClaim(task) {
  proxy.$modal.confirm(`确认认领任务"${task.title}"？认领后请尽快完成。`).then(() => {
    return claimTask(task.taskId)
  }).then(() => {
    proxy.$modal.msgSuccess('认领成功，请前往"我的认领记录"提交完成')
    getList()
    loadMyRecords()
  }).catch(() => {})
}

function openSubmit(row) {
  submitForm.taskId       = row.taskId
  submitForm.serviceHours = 1
  submitForm.proofImage   = ''
  submitForm.summary      = ''
  submitVisible.value = true
  showMyRecords.value = false
}

function handleSubmit() {
  proxy.$refs.submitRef.validate(valid => {
    if (!valid) return
    submitLoading.value = true
    const { taskId, ...body } = submitForm
    submitTask(taskId, body).then(() => {
      proxy.$modal.msgSuccess('提交成功！积分已自动结算到您的账户')
      submitVisible.value = false
      loadMyRecords()
    }).finally(() => { submitLoading.value = false })
  })
}

function loadMyRecords() {
  recordsLoading.value = true
  listMyRecords({ pageNum: 1, pageSize: 50 }).then(res => {
    myRecords.value = res.rows
  }).finally(() => { recordsLoading.value = false })
}

// 打开抽屉时加载
watch(showMyRecords, val => { if (val) loadMyRecords() })

checkVolunteerStatus()
getList()
</script>

<style scoped>
.task-card { margin-bottom: 16px; }
.task-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.task-title  { font-weight:500; font-size:15px; flex:1; margin-right:8px; }
.task-desc   { color:#606266; font-size:13px; min-height:40px;
               display:-webkit-box; -webkit-line-clamp:2;
               -webkit-box-orient:vertical; overflow:hidden; }
.task-meta   { display:flex; justify-content:space-between; align-items:center;
               margin-top:10px; font-size:13px; color:#606266; }
</style>
