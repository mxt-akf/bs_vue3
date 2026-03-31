<template>
    <div class="app-container order-detail">

        <!-- 顶部页头 -->
        <div class="page-header">
            <el-button icon="ArrowLeft" link @click="$router.back()">返回列表</el-button>
            <div class="header-right">
                <span class="order-no">订单编号：{{ order.orderNo }}</span>
                <el-tag :type="getStatusType(order.status)" size="default" effect="dark">
                    {{ getStatusLabel(order.status) }}
                </el-tag>
            </div>
        </div>

        <el-row :gutter="20" v-loading="loading">

            <!-- 左侧主体 -->
            <el-col :span="16">

                <!-- 流程步骤条 -->
                <el-card class="card steps-card">
                    <el-steps :active="currentStep" align-center finish-status="success" process-status="process">
                        <el-step title="发起申请" :description="stepDesc[0]" />
                        <el-step title="价值评估" :description="stepDesc[1]" />
                        <el-step title="双方确认" :description="stepDesc[2]" />
                        <el-step title="管理员审核" :description="stepDesc[3]" />
                        <el-step title="线下履约" :description="stepDesc[4]" />
                        <el-step title="完成" :description="stepDesc[5]" />
                    </el-steps>
                    <div v-if="isCancelledOrDisputed" class="status-alert">
                        <el-alert :title="order.status === 'CANCELLED' ? '订单已取消' : '订单存在争议'"
                            :type="order.status === 'CANCELLED' ? 'error' : 'warning'"
                            :description="order.cancelReason || order.auditRemark" show-icon :closable="false" />
                    </div>
                </el-card>

                <!-- 物品信息 -->
                <el-card class="card">
                    <template #header>
                        <span class="card-title">交换物品信息</span>
                    </template>
                    <div class="items-compare">
                        <div class="item-box">
                            <div class="item-role target">
                                <template v-if="isAdmin">
                                    目标物品
                                    <el-tag size="small" effect="plain" style="margin-left: 4px">{{
                                        order.targetOwnerName }}</el-tag>
                                </template>
                                <template v-else>
                                    {{ isInitiator ? '目标物品（对方）' : '您的物品（对方申请）' }}
                                </template>
                            </div>
                            <image-preview :src="order.targetCoverImage" :width="80" :height="80" class="item-img" />
                            <div class="item-name">{{ order.targetProductName }}</div>
                            <div class="item-price" v-if="order.targetValue">参考价 ￥{{ order.targetValue }}</div>
                        </div>

                        <div class="exchange-icon">
                            <el-icon size="28" color="var(--el-color-primary)">
                                <Switch />
                            </el-icon>
                        </div>

                        <div class="item-box">
                            <div class="item-role offer">
                                <template v-if="isAdmin">
                                    {{ order.exchangeType === 'item' ? '提供物品' : '提供积分' }}
                                    <el-tag size="small" effect="plain" type="success" style="margin-left: 4px">{{
                                        order.initiatorName
                                        }}</el-tag>
                                </template>
                                <template v-else>
                                    {{ isInitiator
                                        ? (order.exchangeType === 'item' ? '提供物品（我方）' : '提供积分')
                                        : (order.exchangeType === 'item' ? '对方提供物品' : '对方提供积分')
                                    }}
                                </template>
                            </div>

                            <template v-if="order.exchangeType === 'item'">
                                <template v-if="order.offerCoverImage">
                                    <image-preview :src="order.offerCoverImage" :width="80" :height="80"
                                        class="item-img" />
                                </template>
                                <template v-else>
                                    <div class="item-img placeholder-img">
                                        <el-icon size="32" color="var(--el-text-color-placeholder)">
                                            <Box />
                                        </el-icon>
                                    </div>
                                </template>
                                <div class="item-name">{{ order.offerProductName || '-' }}</div>
                            </template>
                            <template v-else>
                                <div class="points-display">
                                    <el-icon size="40" color="#f59e0b">
                                        <Coin />
                                    </el-icon>
                                    <span class="points-num">{{ order.offerPoints }}</span>
                                    <span class="points-unit">积分</span>
                                </div>
                            </template>
                        </div>
                    </div>
                </el-card>

                <!-- 估值信息 -->
                <el-card class="card" v-if="showEvaluation">
                    <template #header>
                        <span class="card-title">价值评估</span>
                    </template>
                    <el-descriptions :column="3" border>
                        <el-descriptions-item>
                            <!-- 动态标签：当前用户是发起方则标注"我的估值" -->
                            <template #label>
                                发起方估值
                                <el-tag v-if="isInitiator" size="small" type="primary" effect="plain"
                                    style="margin-left: 4px">
                                    我
                                </el-tag>
                            </template>
                            <span v-if="order.initiatorValue" class="price-text">￥{{ order.initiatorValue }}</span>
                            <el-tag v-else type="info" size="small">未填写</el-tag>
                        </el-descriptions-item>

                        <el-descriptions-item>
                            <template #label>
                                目标方估值
                                <el-tag v-if="isTargetOwner" size="small" type="primary" effect="plain"
                                    style="margin-left: 4px">
                                    我
                                </el-tag>
                            </template>
                            <span v-if="order.targetValue" class="price-text">￥{{ order.targetValue }}</span>
                            <!-- 目标方自己还没填时提示更明确 -->
                            <el-tag v-else-if="isTargetOwner" type="warning" size="small">待您填写</el-tag>
                            <el-tag v-else type="warning" size="small">待填写</el-tag>
                        </el-descriptions-item>

                        <el-descriptions-item label="最终成交估值">
                            <span v-if="order.finalValue" class="price-text final">￥{{ order.finalValue }}</span>
                            <el-tag v-else type="info" size="small">待确定</el-tag>
                        </el-descriptions-item>
                    </el-descriptions>

                    <el-alert v-if="valueDiffWarning" title="双方估值偏差超过50%，建议重新协商" type="warning" show-icon
                        :closable="false" class="mt-12" />
                </el-card>

                <!-- 审核信息 -->
                <el-card class="card" v-if="order.auditRemark || order.auditTime">
                    <template #header>
                        <span class="card-title">审核信息</span>
                    </template>
                    <el-descriptions :column="2" border>
                        <el-descriptions-item label="审核时间">{{ parseTime(order.auditTime) }}</el-descriptions-item>
                        <el-descriptions-item label="审核备注">{{ order.auditRemark || '-' }}</el-descriptions-item>
                    </el-descriptions>
                </el-card>

            </el-col>

            <!-- 右侧操作区 -->
            <el-col :span="8">

                <!-- 订单基本信息 -->
                <el-card class="card">
                    <template #header>
                        <span class="card-title">订单信息</span>
                    </template>
                    <el-descriptions :column="1" border>
                        <el-descriptions-item label="发起人">{{ order.initiatorName }}</el-descriptions-item>
                        <el-descriptions-item label="交换方式">
                            <el-tag :type="order.exchangeType === 'item' ? 'primary' : 'warning'" size="small">
                                {{ order.exchangeType === 'item' ? '以物换物' : '积分置换' }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="申请说明">{{ order.remark || '无' }}</el-descriptions-item>
                        <el-descriptions-item label="创建时间">{{ parseTime(order.createTime) }}</el-descriptions-item>
                    </el-descriptions>
                </el-card>

                <!-- 动态操作区 -->
                <el-card class="card action-card">
                    <template #header>
                        <span class="card-title">操作</span>
                    </template>

                    <!-- PENDING -->
                    <template v-if="order.status === 'PENDING'">

                        <!-- 目标方：看到接受/拒绝 -->
                        <template v-if="isTargetOwner">
                            <p class="action-tip">对方申请与您的物品进行交换，请确认是否接受</p>
                            <div class="action-btns">
                                <el-button type="success" class="btn-full" @click="handleAccept"
                                    :loading="actionLoading">
                                    接受申请
                                </el-button>
                                <el-button type="danger" class="btn-full" @click="rejectDialog.visible = true">
                                    拒绝申请
                                </el-button>
                            </div>
                        </template>

                        <!-- 发起方：等待确认 -->
                        <template v-else-if="isInitiator">
                            <el-result icon="info" title="等待对方确认" sub-title="您的交换申请已发送，请等待对方确认">
                                <template #extra>
                                    <el-button type="primary" @click="getDetail">刷新状态</el-button>
                                </template>
                            </el-result>
                        </template>

                        <!-- 管理员：仅查看 -->
                        <template v-else>
                            <el-result icon="info" title="待双方确认" sub-title="该订单正在等待目标方响应" />
                        </template>

                    </template>

                    <!-- EVALUATING -->
                    <template v-else-if="order.status === 'EVALUATING'">

                        <!-- 目标方填写估值 -->
                        <template v-if="isTargetOwner && !order.targetValue">
                            <p class="action-tip">请填写您认为的合理交换价值</p>
                            <el-form :model="evaluateForm" label-width="80px">
                                <el-form-item label="期望估值">
                                    <el-input-number v-model="evaluateForm.targetValue" :min="0" :precision="2"
                                        controls-position="right" style="width:100%" />
                                </el-form-item>
                            </el-form>
                            <el-button type="primary" class="btn-full" @click="handleEvaluate" :loading="actionLoading">
                                提交估值
                            </el-button>
                        </template>

                        <!-- 目标方已提交，等待系统确认 -->
                        <template v-else-if="isTargetOwner && order.targetValue">
                            <el-result icon="success" title="估值已提交" sub-title="等待系统自动确认中" />
                        </template>

                        <!-- 发起方等待 -->
                        <template v-else-if="isInitiator">
                            <el-result icon="info" title="等待对方估值" sub-title="对方正在填写期望价值，请耐心等待">
                                <template #extra>
                                    <el-button type="primary" @click="getDetail">刷新状态</el-button>
                                </template>
                            </el-result>
                        </template>

                        <!-- 管理员查看 -->
                        <template v-else>
                            <el-result icon="info" title="估值进行中" />
                        </template>

                    </template>

                    <!-- CONFIRMED -->
                    <template v-else-if="order.status === 'CONFIRMED'">
                        <template v-if="isInitiator || isTargetOwner">
                            <p class="action-tip">双方已确认估值，可提交管理员审核</p>
                            <el-button type="primary" class="btn-full" @click="handleToAudit" :loading="actionLoading">
                                提交审核
                            </el-button>
                        </template>
                        <!-- 管理员查看 -->
                        <template v-else>
                            <el-result icon="info" title="待提交审核" sub-title="等待交易双方提交管理员审核" />
                        </template>
                    </template>

                    <!-- AUDITING -->
                    <template v-else-if="order.status === 'AUDITING'">
                        <!-- 管理员审核 -->
                        <template v-if="isAdmin">
                            <p class="action-tip">请审核本次交换申请</p>
                            <el-input v-model="auditForm.remark" type="textarea" :rows="3" placeholder="审核备注（选填）"
                                class="mb-8" />
                            <div class="action-btns">
                                <el-button type="success" class="btn-full" @click="handleAuditPass"
                                    :loading="actionLoading">
                                    审核通过
                                </el-button>
                                <el-button type="danger" class="btn-full" @click="handleAuditReject"
                                    :loading="actionLoading">
                                    审核驳回
                                </el-button>
                            </div>
                        </template>

                        <!-- 普通用户等待 -->
                        <template v-else>
                            <el-result icon="info" title="等待管理员审核" sub-title="订单已提交审核，请耐心等待">
                                <template #extra>
                                    <el-button type="primary" @click="getDetail">刷新状态</el-button>
                                </template>
                            </el-result>
                        </template>
                    </template>

                    <!-- FULFILLING -->
                    <template v-else-if="order.status === 'FULFILLING'">
                        <template v-if="isInitiator || isTargetOwner">
                            <p class="action-tip">请在线下完成交换后，点击确认收货</p>
                            <el-button type="success" class="btn-full" @click="handleFulfill" :loading="actionLoading">
                                确认收货完成
                            </el-button>
                        </template>
                        <template v-else>
                            <el-result icon="info" title="线下履约中" sub-title="等待双方确认收货" />
                        </template>
                    </template>

                    <!-- 终态 -->
                    <template v-else-if="order.status === 'COMPLETED'">
                        <el-result icon="success" title="交换已完成" sub-title="本次交换流程已顺利完成" />
                    </template>
                    <template v-else-if="order.status === 'CANCELLED'">
                        <el-result icon="error" title="订单已取消" :sub-title="order.cancelReason || ''" />
                    </template>
                    <template v-else-if="order.status === 'DISPUTED'">
                        <el-result icon="warning" title="订单存在争议" sub-title="请联系管理员处理" />
                    </template>

                </el-card>

            </el-col>
        </el-row>

        <!-- 拒绝申请弹窗 -->
        <el-dialog v-model="rejectDialog.visible" title="拒绝申请" width="420px" append-to-body>
            <el-form :model="rejectDialog" label-width="80px">
                <el-form-item label="拒绝原因">
                    <el-input v-model="rejectDialog.reason" type="textarea" :rows="3" placeholder="请填写拒绝原因" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="rejectDialog.visible = false">取 消</el-button>
                <el-button type="danger" :loading="actionLoading" @click="handleReject">确认拒绝</el-button>
            </template>
        </el-dialog>

    </div>
</template>

<script setup name="ExchangeOrderDetail">
import { useRoute } from 'vue-router'
import useUserStore from '@/store/modules/user'
import {
    getExchangeOrder, acceptApply, rejectApply,
    submitEvaluate, submitToAudit, auditPass, auditReject, confirmFulfill
} from '@/api/product/exchange'

const { proxy } = getCurrentInstance()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const actionLoading = ref(false)
const order = ref({})

const evaluateForm = reactive({ targetValue: undefined })
const auditForm = reactive({ remark: '' })
const rejectDialog = reactive({ visible: false, reason: '' })

const statusOptions = [
    { value: 'PENDING', label: '待确认', type: 'info' },
    { value: 'EVALUATING', label: '估值中', type: 'warning' },
    { value: 'CONFIRMED', label: '已确认', type: 'primary' },
    { value: 'AUDITING', label: '审核中', type: 'warning' },
    { value: 'FULFILLING', label: '履约中', type: 'primary' },
    { value: 'COMPLETED', label: '已完成', type: 'success' },
    { value: 'CANCELLED', label: '已取消', type: 'danger' },
    { value: 'DISPUTED', label: '争议中', type: 'danger' }
]

const stepMap = {
    PENDING: 0, EVALUATING: 1, CONFIRMED: 2,
    AUDITING: 3, FULFILLING: 4, COMPLETED: 5
}

const currentStep = computed(() => stepMap[order.value.status] ?? 0)

const stepDesc = computed(() => {
    const s = order.value.status
    return [
        s === 'PENDING' ? '等待对方确认' : '已发起',
        s === 'EVALUATING' ? '填写估值中' : (currentStep.value > 1 ? '已完成' : ''),
        s === 'CONFIRMED' ? '等待提交审核' : (currentStep.value > 2 ? '已确认' : ''),
        s === 'AUDITING' ? '审核中' : (currentStep.value > 3 ? '已通过' : ''),
        s === 'FULFILLING' ? '线下交换中' : (currentStep.value > 4 ? '已完成' : ''),
        s === 'COMPLETED' ? '交换成功' : ''
    ]
})

const isCancelledOrDisputed = computed(() =>
    ['CANCELLED', 'DISPUTED'].includes(order.value.status)
)

const showEvaluation = computed(() =>
    ['EVALUATING', 'CONFIRMED', 'AUDITING', 'FULFILLING', 'COMPLETED'].includes(order.value.status)
)

const valueDiffWarning = computed(() => {
    const { initiatorValue, targetValue } = order.value
    if (!initiatorValue || !targetValue) return false
    const diff = Math.abs(initiatorValue - targetValue)
    const base = Math.max(initiatorValue, targetValue)
    return base > 0 && diff / base > 0.5
})

// 是否为发起方
const isInitiator = computed(() => order.value.initiatorId === userStore.id)

// 是否为目标方（物品所有者，且不是管理员）
const isTargetOwner = computed(() => {
    return !isInitiator.value && order.value.targetOwnerName === userStore.name
})

const isAdmin = computed(() => userStore.roles.includes('admin'))

function getStatusLabel(status) {
    return statusOptions.find(s => s.value === status)?.label || status
}
function getStatusType(status) {
    return statusOptions.find(s => s.value === status)?.type || 'info'
}

function getDetail() {
    loading.value = true
    getExchangeOrder(route.params.id).then(res => {
        order.value = res.data
    }).finally(() => { loading.value = false })
}

function handleAccept() {
    proxy.$modal.confirm('确认接受本次交换申请？').then(() => {
        actionLoading.value = true
        return acceptApply(order.value.orderId)
    }).then(() => {
        proxy.$modal.msgSuccess('已接受申请，请填写估值')
        getDetail()
    }).finally(() => { actionLoading.value = false })
}

function handleReject() {
    if (!rejectDialog.reason.trim()) {
        proxy.$modal.msgWarning('请填写拒绝原因')
        return
    }
    actionLoading.value = true
    rejectApply(order.value.orderId, rejectDialog.reason).then(() => {
        proxy.$modal.msgSuccess('已拒绝申请')
        rejectDialog.visible = false
        getDetail()
    }).finally(() => { actionLoading.value = false })
}

function handleEvaluate() {
    if (!evaluateForm.targetValue) {
        proxy.$modal.msgWarning('请填写期望估值')
        return
    }
    actionLoading.value = true
    submitEvaluate(order.value.orderId, evaluateForm.targetValue).then(() => {
        proxy.$modal.msgSuccess('估值提交成功')
        getDetail()
    }).finally(() => { actionLoading.value = false })
}

function handleToAudit() {
    proxy.$modal.confirm('确认提交管理员审核？').then(() => {
        actionLoading.value = true
        submitToAudit(order.value.orderId).then(() => {
            proxy.$modal.msgSuccess('审核提交成功')
            getDetail()
        }).finally(() => { actionLoading.value = false })
    }).catch(() => { })
}

function handleAuditPass() {
    actionLoading.value = true
    auditPass(order.value.orderId, auditForm.remark).then(() => {
        proxy.$modal.msgSuccess('审核通过')
        getDetail()
    }).finally(() => { actionLoading.value = false })
}

function handleAuditReject() {
    if (!auditForm.remark.trim()) {
        proxy.$modal.msgWarning('驳回时请填写审核备注')
        return
    }
    actionLoading.value = true
    auditReject(order.value.orderId, auditForm.remark).then(() => {
        proxy.$modal.msgSuccess('已驳回')
        getDetail()
    }).finally(() => { actionLoading.value = false })
}

function handleFulfill() {
    proxy.$modal.confirm('确认已在线下完成交换？').then(() => {
        actionLoading.value = true
        return confirmFulfill(order.value.orderId)
    }).then(() => {
        proxy.$modal.msgSuccess('交换完成！')
        getDetail()
        userStore.getInfo()
    }).finally(() => { actionLoading.value = false })
}

getDetail()
</script>

<style scoped lang="scss">
.order-detail {
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding: 12px 16px;
        background: var(--el-bg-color);
        border-radius: 8px;
        border: 1px solid var(--el-border-color-lighter);

        .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .order-no {
            font-size: 13px;
            color: var(--el-text-color-secondary);
            font-family: monospace;
        }
    }

    .card {
        margin-bottom: 16px;
        border-radius: 8px;
    }

    .card-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
    }

    .steps-card {
        :deep(.el-steps) {
            padding: 8px 0;
        }
    }

    .status-alert {
        margin-top: 16px;
    }

    // 物品对比布局
    .items-compare {
        display: flex;
        align-items: center;
        gap: 16px;

        .item-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 16px;
            background: var(--el-fill-color-lighter);
            border-radius: 10px;
            border: 1px solid var(--el-border-color-lighter);
            text-align: center;
            gap: 8px;

            .item-role {
                font-size: 11px;
                font-weight: 600;
                padding: 6px 10px;
                border-radius: 8px;

                &.target {
                    background: var(--el-color-primary-light-9);
                    color: var(--el-color-primary);
                }

                &.offer {
                    background: var(--el-color-success-light-9);
                    color: var(--el-color-success);
                }
            }

            .item-img {
                border-radius: 8px;
                overflow: hidden;
            }

            .placeholder-img {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--el-fill-color);
                border-radius: 8px;
                border: 1px dashed var(--el-border-color);
            }

            .item-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--el-text-color-primary);
                line-height: 1.4;
            }

            .item-price {
                font-size: 12px;
                color: var(--el-color-danger);
            }

            .points-display {
                padding: 8px 0;

                .points-num {
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--el-color-warning);
                    line-height: 1;
                }

                .points-unit {
                    font-size: 14px;
                    color: var(--el-text-color-secondary);
                    margin-left: 4px;
                }
            }
        }

        .exchange-icon {
            flex-shrink: 0;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--el-color-primary-light-9);
            border-radius: 50%;
            border: 2px solid var(--el-color-primary-light-5);
        }
    }

    .price-text {
        color: var(--el-color-danger);
        font-weight: 500;

        &.final {
            font-size: 16px;
            font-weight: 700;
        }
    }

    .action-card {
        .action-tip {
            font-size: 14px;
            color: var(--el-text-color-secondary);
            margin-bottom: 16px;
            padding: 10px 12px;
            background: var(--el-fill-color-lighter);
            border-radius: 5px;
            border-left: 3px solid var(--el-color-primary-light-5);
        }

        .action-btns {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .btn-full {
            width: 100%;
            margin: 0 !important;
        }

        .mb-8 {
            margin-bottom: 8px;
        }
    }

    .mt-12 {
        margin-top: 12px;
    }
}

.points-display {
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .points-num {
        font-size: 32px;
        font-weight: 700;
        color: var(--el-color-warning);
        line-height: 1;
    }

    .points-unit {
        font-size: 14px;
        color: var(--el-text-color-secondary);
    }
}
</style>