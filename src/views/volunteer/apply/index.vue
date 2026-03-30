<template>
  <div class="app-container">

    <!-- 已是志愿者 -->
    <el-result v-if="volunteerInfo && volunteerInfo.status === 'APPROVED'"
      icon="success" title="您已是认证志愿者">
      <template #sub-title>
        <p>真实姓名：{{ volunteerInfo.realName }}｜联系电话：{{ volunteerInfo.phone }}</p>
        <p style="margin-top: 4px; color: #909399">审核通过时间：{{ parseTime(volunteerInfo.auditTime) }}</p>
      </template>
      <template #extra>
        <el-button type="primary" @click="$router.push('/volunteer/board')">前往任务看板</el-button>
      </template>
    </el-result>

    <!-- 审核中 -->
    <el-result v-else-if="volunteerInfo && volunteerInfo.status === 'PENDING'"
      icon="warning" title="申请审核中">
      <template #sub-title>
        <p>您的申请正在等待管理员审核，请耐心等待</p>
      </template>
    </el-result>

    <!-- 被拒绝 / 未申请 -->
    <el-card v-else class="apply-card">
      <template #header>
        <span>{{ volunteerInfo && volunteerInfo.status === 'REJECTED' ? '重新申请志愿者' : '申请成为志愿者' }}</span>
      </template>

      <el-alert v-if="volunteerInfo && volunteerInfo.status === 'REJECTED'"
        :title="`上次申请被拒绝：${volunteerInfo.auditRemark || '无说明'}`"
        type="warning" :closable="false" style="margin-bottom: 20px" />

      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" maxlength="30" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="11" />
        </el-form-item>
        <el-form-item label="申请理由" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4"
            placeholder="请简述您申请成为志愿者的理由和服务意愿"
            maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交申请</el-button>
        </el-form-item>
      </el-form>
    </el-card>

  </div>
</template>

<script setup name="VolunteerApply">
import { getMyVolunteerInfo, applyVolunteer } from '@/api/volunteer'

const { proxy } = getCurrentInstance()
const volunteerInfo = ref(null)
const submitLoading = ref(false)

const form = reactive({ realName: '', phone: '', reason: '' })

const rules = {
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  reason: [{ required: true, message: '请填写申请理由', trigger: 'blur' }]
}

async function loadMyInfo() {
  const res = await getMyVolunteerInfo()
  volunteerInfo.value = res.data
  // 被拒绝时回填上次数据
  if (res.data && res.data.status === 'REJECTED') {
    form.realName = res.data.realName || ''
    form.phone    = res.data.phone    || ''
    form.reason   = res.data.reason   || ''
  }
}

function handleSubmit() {
  proxy.$refs.formRef.validate(valid => {
    if (!valid) return
    submitLoading.value = true
    applyVolunteer({ ...form }).then(() => {
      proxy.$modal.msgSuccess('申请提交成功，等待审核')
      loadMyInfo()
    }).finally(() => { submitLoading.value = false })
  })
}

loadMyInfo()
</script>

<style scoped>
.apply-card { max-width: 560px; margin: 40px auto; }
</style>
