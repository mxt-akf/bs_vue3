<template>
  <div class="app-container">
    <!-- 搜索表单 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true">
      <el-form-item label="" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="搜索"
          clearable
          style="width: 240px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete">删除</el-button>
      </el-col>
      <!-- <right-toolbar @queryTable="getList"></right-toolbar> -->
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="demoList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" type="index" width="50" align="center" />
      <el-table-column label="名称" align="center" prop="name" />
      <el-table-column label="状态" align="center" prop="status" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="demoRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-input v-model="form.status" placeholder="请输入状态" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
// import { listDemo, getDemo, delDemo, addDemo, updateDemo } from "@/api/demo/demo"

const { proxy } = getCurrentInstance()
// const { sys_normal_disable } = proxy.useDict("sys_normal_disable")

// 模拟数据
const demoList = ref([
  { id: 1, name: '测试数据1', status: '正常', createTime: '2024-01-01 10:00:00' },
  { id: 2, name: '测试数据2', status: '停用', createTime: '2024-01-02 10:00:00' }
])
const open = ref(false)
const loading = ref(false)
// const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(2)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: "名称不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询列表 */
function getList() {
  loading.value = true
  // 模拟接口调用
  setTimeout(() => {
    loading.value = false
  }, 500)
  
  // 真实接口调用（需要放开上面的import）
  // listDemo(queryParams.value).then(response => {
  //   demoList.value = response.rows
  //   total.value = response.total
  //   loading.value = false
  // })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    name: undefined,
    status: undefined,
    remark: undefined
  }
  proxy.resetForm("demoRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加数据"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  // const id = row.id || ids.value
  // getDemo(id).then(response => {
  //   form.value = response.data
  //   open.value = true
  //   title.value = "修改数据"
  // })
  
  // 模拟回显
  form.value = { ...row }
  open.value = true
  title.value = "修改数据"
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["demoRef"].validate(valid => {
    if (valid) {
      // if (form.value.id != undefined) {
      //   updateDemo(form.value).then(response => {
      //     proxy.$modal.msgSuccess("修改成功")
      //     open.value = false
      //     getList()
      //   })
      // } else {
      //   addDemo(form.value).then(response => {
      //     proxy.$modal.msgSuccess("新增成功")
      //     open.value = false
      //     getList()
      //   })
      // }
      
      // 模拟提交
      console.log('提交数据：', form.value)
      proxy.$modal.msgSuccess(form.value.id ? "修改成功" : "新增成功")
      open.value = false
      getList()
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const demoIds = row.id || ids.value
  proxy.$modal.confirm('是否确认删除编号为"' + demoIds + '"的数据项？').then(function() {
    // return delDemo(demoIds)
    console.log('删除ID：', demoIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>