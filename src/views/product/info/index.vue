<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="auto">
      <el-form-item label="" prop="productName">
        <el-input v-model="queryParams.productName" placeholder="请输入产品名称" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="" prop="categoryId">
        <el-select v-model="queryParams.categoryId" placeholder="请选择产品分类" clearable>
          <el-option v-for="item in categoryOptions" :key="item.categoryId" :label="item.categoryName"
            :value="item.categoryId" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb8" style="display: flex;  align-items: center;">
      <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['product:info:add']">新增发布</el-button>

      <el-button v-if="isAdmin" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate"
        v-hasPermi="['product:info:edit']">修改</el-button>

      <el-button v-if="isAdmin" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete"
        v-hasPermi="['product:info:remove']">删除</el-button>

      <el-button v-if="isAdmin" type="warning" plain icon="Download" @click="handleExport"
        v-hasPermi="['product:info:export']">导出</el-button>

      <right-toolbar style="margin-left: auto" v-model:showSearch="showSearch" @queryTable="getList" />
    </div>

    <el-table v-loading="loading" :data="productList" @selection-change="handleSelectionChange" border
      :row-class-name="tableRowClassName">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="产品名称" align="center" prop="productName" :show-overflow-tooltip="true">
        <template #default="scope">
          <el-tag v-if="scope.row.createBy === currentUserName" size="small" type="success" effect="dark"
            style="margin-right: 5px;">我的</el-tag>

          <span>{{ scope.row.productName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="封面图" align="center">
        <template #default="scope">
          <image-preview :src="scope.row.coverImage" :width="60" :height="60" />
        </template>
      </el-table-column>
      <el-table-column label="所属分类" align="center" prop="categoryName" width="120" />
      <el-table-column label="价格" align="center" prop="price" width="100">
        <template #default="scope">
          <span style="color: #f56c6c; font-weight: bold;">￥{{ scope.row.price }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template #default="{ row }">
          <el-tag :type="statusTagType[row.status]" size="small">
            {{ statusLabel[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布人" align="center" prop="createBy" width="120" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
        <template #default="scope">
          <template v-if="scope.row.createBy === currentUserName || isAdmin">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)"
              v-hasPermi="['product:info:edit']">修改</el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)"
              v-hasPermi="['product:info:remove']">删除</el-button>
          </template>

          <template v-else>
            <el-button link type="warning" icon="Sort" @click="handleApplyExchange(scope.row)" :disabled="scope.row.status !== 0"
              v-hasPermi="['exchange:order:add']">
              {{ scope.row.status === 0 ? '发起交换' : scope.row.status === 1 ? '锁定中' : '已下架' }}
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="560px" append-to-body>
      <el-form ref="productRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="form.productName" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categoryOptions" :key="item.categoryId" :label="item.categoryName"
              :value="item.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面图片" prop="coverImage">
          <image-upload v-model="form.coverImage" :limit="1" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-number v-model="form.price" :min="0" :precision="2" :step="0.01" controls-position="right"
            style="width: 100%" />
        </el-form-item>
        <el-form-item label="个数" prop="quantity">
          <el-input-number v-model="form.quantity" :min="0" :precision="0" controls-position="right"
            style="width: 100%" />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <ExchangeApplyDialog v-model="applyDialogVisible" :target-item="currentItem" @success="handleApplySuccess" />
  </div>
</template>

<script setup name="ProductInfo">
import { listProductInfo, getProductInfo, addProductInfo, updateProductInfo, delProductInfo } from '@/api/product/info'
import { listCategory } from '@/api/product/category'
import ExchangeApplyDialog from './ExchangeApplyDialog.vue'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const userStore = useUserStore()

const productList = ref([])
const categoryOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

// 身份计算
const currentUserName = computed(() => userStore.name)
const isAdmin = computed(() => userStore.roles.includes('admin'))

// 自己发布的高亮
function tableRowClassName({ row }) {
  if (row.createBy === currentUserName.value) {
    return 'my-row';
  }
  return '';
}

// 发起交换相关
const applyDialogVisible = ref(false)
const currentItem = ref({})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  productName: undefined,
  categoryId: undefined
})

const form = ref({})

const rules = {
  productName: [{ required: true, message: '产品名称不能为空', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
  coverImage: [{ required: true, message: '请上传封面图片', trigger: 'change' }],  // 加这行
  price: [{ required: true, message: '价格不能为空', trigger: 'blur' }],
  quantity: [{ required: true, message: '个数不能为空', trigger: 'blur' }]
}

const statusLabel = { 0: '上架中', 1: '锁定中', 2: '已下架' }
const statusTagType = { 0: 'success', 1: 'warning', 2: 'info' }

function getCategoryOptions() {
  listCategory({ pageNum: 1, pageSize: 1000 }).then(response => {
    categoryOptions.value = response.rows
  })
}

function getList() {
  loading.value = true
  listProductInfo(queryParams).then(response => {
    productList.value = response.rows
    total.value = response.total
  }).finally(() => {
    loading.value = false
  })
}

function reset() {
  form.value = {
    productId: undefined,
    productName: undefined,
    categoryId: undefined,
    coverImage: undefined,
    price: undefined,
    quantity: undefined,
    remark: undefined
  }
  proxy.resetForm('productRef')
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.productId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '添加产品'
}

function handleUpdate(row) {
  reset()
  const productId = row.productId || ids.value[0]
  getProductInfo(productId).then(response => {
    form.value = response.data
    open.value = true
    title.value = '修改产品'
  })
}

function cancel() {
  open.value = false
  reset()
}

function submitForm() {
  proxy.$refs['productRef'].validate(valid => {
    if (!valid) return
    const isEdit = form.value.productId !== undefined
    const api = isEdit ? updateProductInfo : addProductInfo
    api(form.value).then(() => {
      proxy.$modal.msgSuccess(isEdit ? '修改成功' : '新增成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const productIds = row.productId || ids.value.join(',')
  proxy.$modal.confirm(`是否确认删除产品编号为"${productIds}"的数据项？`).then(() => {
    return delProductInfo(productIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => { })
}

function handleExport() {
  proxy.download('product/info/export', { ...queryParams }, `product_info_${new Date().getTime()}.xlsx`)
}

/** 发起交换 */
function handleApplyExchange(row) {
  currentItem.value = { ...row }
  applyDialogVisible.value = true
}

/** 申请成功回调 */
function handleApplySuccess() {
  // 后续可跳转订单列表或刷新状态
  // proxy.$router.push('/exchange/order/list')
}

getCategoryOptions()
getList()
</script>

<style scoped>
:deep(.el-table .my-row) {
  --el-table-tr-bg-color: #53535309;
  /* 这里是淡绿色，你可以换成 # (浅橙) */
}

:deep(.el-table .my-row:hover > td) {
  background-color: #53535321 !important;
}
</style>