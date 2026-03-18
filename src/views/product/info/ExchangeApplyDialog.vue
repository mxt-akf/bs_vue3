<template>
  <el-dialog
    v-model="visible"
    title="发起交换申请"
    width="560px"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <!-- 目标物品信息 -->
    <div class="target-item-card">
      <div class="target-label">申请交换物品</div>
      <div class="target-info">
        <image-preview :src="targetItem.coverImage" :width="64" :height="64" class="cover" />
        <div class="meta">
          <div class="name">{{ targetItem.productName }}</div>
          <div class="sub">
            <el-tag size="small" type="info">{{ targetItem.categoryName }}</el-tag>
            <span class="price">￥{{ targetItem.price }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-divider />

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <!-- 交换方式 -->
      <el-form-item label="交换方式" prop="exchangeType">
        <el-radio-group v-model="form.exchangeType">
          <el-radio-button value="item">
            <el-icon><Box /></el-icon> 以物换物
          </el-radio-button>
          <el-radio-button value="points">
            <el-icon><Coin /></el-icon> 积分置换
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 以物换物：选择提供的物品 -->
      <el-form-item v-if="form.exchangeType === 'item'" label="提供物品" prop="offerProductId">
        <el-select
          v-model="form.offerProductId"
          placeholder="请选择您要提供的物品"
          style="width: 100%"
          :loading="offerLoading"
        >
          <el-option
            v-for="item in myProducts"
            :key="item.productId"
            :label="`${item.productName}（￥${item.price}）`"
            :value="item.productId"
          >
            <div class="option-item">
              <span>{{ item.productName }}</span>
              <span class="option-price">￥{{ item.price }}</span>
            </div>
          </el-option>
        </el-select>
        <div v-if="!myProducts.length && !offerLoading" class="no-item-tip">
          <el-icon><WarningFilled /></el-icon> 您暂无可交换的物品，请先发布物品
        </div>
      </el-form-item>

      <!-- 积分置换：输入积分 -->
      <el-form-item v-if="form.exchangeType === 'points'" label="使用积分" prop="offerPoints">
        <el-input-number
          v-model="form.offerPoints"
          :min="1"
          :max="currentPoints"
          controls-position="right"
          style="width: 100%"
          placeholder="请输入积分数量"
        />
        <div class="points-tip">当前可用积分：<b>{{ currentPoints }}</b> 分</div>
      </el-form-item>

      <!-- 期望价值 -->
      <el-form-item label="期望估值" prop="initiatorValue">
        <el-input-number
          v-model="form.initiatorValue"
          :min="0"
          :precision="2"
          controls-position="right"
          style="width: 100%"
          placeholder="请填写您认为的合理价值（元）"
        />
        <div class="hint-text">双方估值偏差过大时系统将提示协商</div>
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="申请说明" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          :maxlength="200"
          show-word-limit
          placeholder="请描述您的交换意向，如物品状况、交换条件等"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup name="ExchangeApplyDialog">
import { Box, Coin, WarningFilled } from '@element-plus/icons-vue'
import { listProductInfo } from '@/api/product/info'
import { applyExchange } from '@/api/product/exchange'
import useUserStore from '@/store/modules/user'

const userStore = useUserStore()
const { proxy } = getCurrentInstance()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 目标物品信息
  targetItem: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const submitLoading = ref(false)
const offerLoading = ref(false)
const myProducts = ref([])
const currentPoints = ref(520) // TODO: 从用户信息中获取

const form = reactive({
  exchangeType: 'item',
  offerProductId: undefined,
  offerPoints: undefined,
  initiatorValue: undefined,
  remark: ''
})

const rules = {
  exchangeType: [{ required: true, message: '请选择交换方式', trigger: 'change' }],
  offerProductId: [{
    required: true,
    validator: (rule, value, callback) => {
      if (form.exchangeType === 'item' && !value) callback(new Error('请选择提供的物品'))
      else callback()
    },
    trigger: 'change'
  }],
  offerPoints: [{
    required: true,
    validator: (rule, value, callback) => {
      if (form.exchangeType === 'points' && !value) callback(new Error('请输入使用的积分'))
      else callback()
    },
    trigger: 'blur'
  }],
  initiatorValue: [{ required: true, message: '请填写期望估值', trigger: 'blur' }]
}

// 监听弹窗打开，加载我的物品列表
watch(visible, (val) => {
  if (val) loadMyProducts()
})

// 切换交换方式时清空对应字段
watch(() => form.exchangeType, () => {
  form.offerProductId = undefined
  form.offerPoints = undefined
  formRef.value?.clearValidate()
})

function loadMyProducts() {
  offerLoading.value = true
  listProductInfo({
    pageNum: 1,
    pageSize: 100,
    createBy: userStore.name
  }).then(res => {
    myProducts.value = (res.rows || []).filter(
      item => item.productId !== props.targetItem.productId
    )
  }).finally(() => { offerLoading.value = false })
}

function handleSubmit() {
  formRef.value.validate(valid => {
    if (!valid) return
    submitLoading.value = true

    const payload = {
      targetProductId: props.targetItem.productId,
      exchangeType: form.exchangeType,
      offerProductId: form.exchangeType === 'item' ? form.offerProductId : undefined,
      offerPoints: form.exchangeType === 'points' ? form.offerPoints : undefined,
      initiatorValue: form.initiatorValue,
      remark: form.remark
    }

    applyExchange(payload).then(() => {
      proxy.$modal.msgSuccess('申请提交成功，等待对方确认')
      emit('success')
      handleClose()
    }).finally(() => { submitLoading.value = false })
  })
}

function handleClose() {
  formRef.value?.resetFields()
  form.exchangeType = 'item'
  visible.value = false
}
</script>

<style scoped lang="scss">
.target-item-card {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 4px;

  .target-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 10px;
  }

  .target-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .cover {
      border-radius: 6px;
      flex-shrink: 0;
    }

    .meta {
      flex: 1;
      .name {
        font-size: 15px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 6px;
      }
      .sub {
        display: flex;
        align-items: center;
        gap: 8px;
        .price {
          font-size: 14px;
          color: var(--el-color-danger);
          font-weight: 500;
        }
      }
    }
  }
}

.option-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  .option-price {
    color: var(--el-color-danger);
    font-size: 12px;
  }
}

.no-item-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-warning);
  display: flex;
  align-items: center;
  gap: 4px;
}

.points-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  b { color: var(--el-color-primary); }
}

.hint-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>