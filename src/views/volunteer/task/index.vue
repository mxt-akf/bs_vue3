<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item prop="title">
        <el-input v-model="queryParams.title" placeholder="任务标题" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item prop="status">
        <el-select v-model="queryParams.status" placeholder="任务状态" clearable style="width:120px">
          <el-option label="待认领" value="OPEN"     />
          <el-option label="进行中" value="ASSIGNED" />
          <el-option label="已完成" value="DONE"     />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb8">
      <el-button type="primary" plain icon="Plus" @click="handleAdd"
        v-hasPermi="['volunteer:task:add']">发布任务</el-button>
      <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()"
        v-hasPermi="['volunteer:task:remove']">删除</el-button>
      <right-toolbar style="float:right" v-model:showSearch="showSearch" @queryTable="getList" />
    </div>

    <el-table v-loading="loading" :data="taskList" border @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="任务标题"   prop="title"        show-overflow-tooltip />
      <el-table-column label="积分奖励"   prop="pointsReward" width="100" align="center">
        <template #default="{ row }">
          <b style="color:#f59e0b">{{ row.pointsReward }}</b>
        </template>
      </el-table-column>
      <el-table-column label="截止时间"   prop="deadline"     width="160" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType[row.status]">{{ statusLabel[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" prop="createTime" width="160" align="center" />
      <el-table-column label="操作" align="center" width="200">
        <template #default="{ row }">
          <el-button type="primary" link icon="Edit"
            v-hasPermi="['volunteer:task:edit']"
            @click="handleUpdate(row)">编辑</el-button>
          <el-button type="success" link icon="View"
            v-if="row.status !== 'OPEN'"
            @click="handleViewRecord(row)">查看记录</el-button>
          <el-button type="danger" link icon="Delete"
            v-hasPermi="['volunteer:task:remove']"
            @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total"
      v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize"
      @pagination="getList" />

    <!-- 发布/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="open" width="520px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入任务标题" maxlength="100" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4"
            placeholder="请描述任务内容、要求等" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="积分奖励" prop="pointsReward">
          <el-input-number v-model="form.pointsReward" :min="1" :max="9999"
            controls-position="right" style="width:100%" />
        </el-form-item>
        <el-form-item label="截止时间" prop="deadline">
          <el-date-picker v-model="form.deadline" type="datetime"
            placeholder="请选择截止时间" style="width:100%"
            value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmitForm">确 定</el-button>
      </template>
    </el-dialog>

    <!-- 认领记录抽屉 -->
    <el-drawer title="任务认领记录" v-model="recordDrawer" size="50%">
      <el-descriptions v-if="currentRecord" :column="2" border>
        <el-descriptions-item label="志愿者">{{ currentRecord.realName }}（{{ currentRecord.nickName }}）</el-descriptions-item>
        <el-descriptions-item label="服务时长">{{ currentRecord.serviceHours }}h</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentRecord.submitTime }}</el-descriptions-item>
        <el-descriptions-item label="完成说明" :span="2">{{ currentRecord.summary }}</el-descriptions-item>
        <el-descriptions-item label="完成凭证" :span="2">
          <image-preview v-if="currentRecord.proofImage" :src="currentRecord.proofImage" :width="120" :height="120" />
          <span v-else style="color:#909399">未上传</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无认领记录" />
    </el-drawer>
  </div>
</template>

<script setup name="VolunteerTask">
import { listTask, addTask, updateTask, delTask, getTaskRecord } from '@/api/volunteer'

const { proxy } = getCurrentInstance()
const taskList      = ref([])
const loading       = ref(false)
const showSearch    = ref(true)
const total         = ref(0)
const open          = ref(false)
const submitLoading = ref(false)
const dialogTitle   = ref('')
const ids           = ref([])
const multiple      = ref(true)
const recordDrawer  = ref(false)
const currentRecord = ref(null)

const statusLabel   = { OPEN: '待认领', ASSIGNED: '进行中', DONE: '已完成' }
const statusTagType = { OPEN: 'success', ASSIGNED: 'warning', DONE: 'info' }

const queryParams = reactive({ pageNum: 1, pageSize: 10, title: undefined, status: undefined })

const form = ref({})
const rules = {
  title:        [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  pointsReward: [{ required: true, message: '请设置积分奖励', trigger: 'blur' }]
}

function resetForm() {
  form.value = { taskId: undefined, title: '', description: '', pointsReward: 10, deadline: null, remark: '' }
  proxy.resetForm?.('formRef')
}

function getList() {
  loading.value = true
  listTask(queryParams).then(res => {
    taskList.value = res.rows
    total.value    = res.total
  }).finally(() => { loading.value = false })
}

function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery()  { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.taskId)
  multiple.value = !selection.length
}

function handleAdd() {
  resetForm()
  dialogTitle.value = '发布任务'
  open.value = true
}

function handleUpdate(row) {
  resetForm()
  form.value = { ...row }
  dialogTitle.value = '编辑任务'
  open.value = true
}

function handleSubmitForm() {
  proxy.$refs.formRef.validate(valid => {
    if (!valid) return
    submitLoading.value = true
    const api = form.value.taskId ? updateTask : addTask
    api(form.value).then(() => {
      proxy.$modal.msgSuccess(form.value.taskId ? '修改成功' : '发布成功')
      open.value = false
      getList()
    }).finally(() => { submitLoading.value = false })
  })
}

function handleDelete(row) {
  const taskIds = row?.taskId ?? ids.value.join(',')
  proxy.$modal.confirm(`确认删除任务？`).then(() => {
    return delTask(taskIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

async function handleViewRecord(row) {
  currentRecord.value = null
  recordDrawer.value  = true
  const res = await getTaskRecord(row.taskId)
  currentRecord.value = res.data
}

getList()
</script>
