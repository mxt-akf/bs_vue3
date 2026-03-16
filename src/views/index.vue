<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header">
      <div class="header-left">
        <div class="header-badge">📦 数据看板</div>
        <h1 class="header-title">二手交换平台</h1>
        <p class="header-sub">{{ currentDate }} · 实时数据更新</p>
      </div>
      <div class="header-right">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span>数据实时</span>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <el-row :gutter="16" class="kpi-row">
      <el-col v-for="kpi in kpiList" :key="kpi.key" :xs="12" :sm="12" :md="6">
        <div class="kpi-card" :style="{ '--accent': kpi.color }">
          <div class="kpi-icon">{{ kpi.icon }}</div>
          <div class="kpi-body">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">
              <span v-if="kpi.prefix" class="kpi-prefix">{{ kpi.prefix }}</span>
              <span>{{ displayValues[kpi.key] }}</span>
            </div>
            <div class="kpi-trend" :class="kpi.trend > 0 ? 'up' : 'down'">
              {{ kpi.trend > 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend) }}% 较上月
            </div>
          </div>
          <div class="kpi-spark">
            <div
              v-for="(h, i) in kpi.spark"
              :key="i"
              class="spark-bar"
              :style="{ height: h + '%', opacity: 0.3 + i * 0.1 }"
            ></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts Row 1 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="16">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">交易趋势</div>
              <div class="chart-sub">近12个月交易量与成交额</div>
            </div>
            <div class="chart-tabs">
              <span
                v-for="t in ['交易量', '成交额']"
                :key="t"
                class="chart-tab"
                :class="{ active: activeTab === t }"
                @click="activeTab = t"
              >{{ t }}</span>
            </div>
          </div>
          <div ref="trendChartRef" class="chart-body"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="8">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">品类分布</div>
              <div class="chart-sub">各品类商品占比</div>
            </div>
          </div>
          <div ref="categoryChartRef" class="chart-body"></div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts Row 2 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="8">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">商品成色</div>
              <div class="chart-sub">发布商品新旧程度分布</div>
            </div>
          </div>
          <div ref="conditionChartRef" class="chart-body" style="height: 260px"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="16">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">用户增长</div>
              <div class="chart-sub">新增用户 & 活跃用户趋势</div>
            </div>
          </div>
          <div ref="userChartRef" class="chart-body" style="height: 260px"></div>
        </div>
      </el-col>
    </el-row>

    <!-- Bottom Row: Top Items + Activity Feed -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="12">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">热门品类 TOP 5</div>
            <div class="chart-sub">按成交量排行</div>
          </div>
          <div ref="barChartRef" class="chart-body" style="height: 240px"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="chart-card activity-card">
          <div class="chart-header">
            <div class="chart-title">最新动态</div>
            <div class="chart-sub">实时交易记录</div>
          </div>
          <div
            ref="scrollWrapRef"
            class="activity-scroll-wrap"
            @mouseenter="pauseScroll"
            @mouseleave="resumeScroll"
          >
            <div ref="scrollTrackRef" class="activity-track">
              <!-- 列表渲染两份，实现无缝循环 -->
              <div
                v-for="(item, i) in [...activities, ...activities]"
                :key="i"
                class="activity-item"
              >
                <div class="activity-avatar" :style="{ background: item.color }">
                  {{ item.avatar }}
                </div>
                <div class="activity-info">
                  <div class="activity-main">
                    <span class="activity-user">{{ item.user }}</span>
                    <span class="activity-action">{{ item.action }}</span>
                    <span class="activity-goods">{{ item.goods }}</span>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-price">¥{{ item.price }}</span>
                    <span class="activity-time">{{ item.time }}</span>
                  </div>
                </div>
                <div class="activity-badge" :class="item.type">{{ item.typeLabel }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
import * as echarts from 'echarts'

// ─── Date ────────────────────────────────────────────────────────────────────
const currentDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

// ─── KPI Data ────────────────────────────────────────────────────────────────
const kpiList = [
  { key: 'items',   label: '在售商品',  icon: '🛍️', prefix: '',  value: 128456, trend: 12.4, color: '#f59e0b', spark: [30,45,40,60,55,70,65,80,75,90] },
  { key: 'deals',   label: '本月成交',  icon: '🤝', prefix: '',  value: 8921,   trend: 8.7,  color: '#10b981', spark: [40,35,50,45,65,60,70,65,80,75] },
  { key: 'gmv',     label: '成交金额',  icon: '💰', prefix: '¥', value: 356820, trend: 15.2, color: '#6366f1', spark: [25,40,35,55,50,68,62,75,70,88] },
  { key: 'users',   label: '注册用户',  icon: '👥', prefix: '',  value: 52340,  trend: -2.1, color: '#ec4899', spark: [60,55,65,60,70,65,60,58,55,52] },
]

// ─── Trend Chart ─────────────────────────────────────────────────────────────
const activeTab = ref('交易量')
const trendChartRef = ref(null)
let trendChart = null

const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const volumeData = [3200, 4100, 3800, 5200, 4900, 6800, 7200, 6900, 8100, 7800, 9200, 8921]
const amountData = [128000, 162000, 149000, 198000, 187000, 256000, 278000, 261000, 312000, 298000, 348000, 356820]

function initTrendChart() {
  const isVolume = activeTab.value === '交易量'
  const data = isVolume ? volumeData : amountData
  const color = isVolume ? '#f59e0b' : '#6366f1'

  trendChart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#1e1e2e', borderColor: 'transparent', textStyle: { color: '#e5e7eb' } },
    grid: { left: 16, right: 16, top: 20, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: months, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#9ca3af', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLabel: { color: '#9ca3af', fontSize: 11, formatter: isVolume ? '{value}' : v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v } },
    series: [{
      type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color, width: 2.5 },
      itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '40' },
          { offset: 1, color: color + '00' }
        ])
      }
    }]
  })
}

watch(activeTab, () => { if (trendChart) initTrendChart() })

// ─── Category Donut ───────────────────────────────────────────────────────────
const categoryChartRef = ref(null)

function initCategoryChart(el) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: '#1e1e2e', borderColor: 'transparent', textStyle: { color: '#e5e7eb' } },
    legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { color: '#6b7280', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: [
        { value: 3280, name: '数码电子', itemStyle: { color: '#6366f1' } },
        { value: 2640, name: '服装箱包', itemStyle: { color: '#f59e0b' } },
        { value: 1920, name: '图书文具', itemStyle: { color: '#10b981' } },
        { value: 1580, name: '家居家电', itemStyle: { color: '#ec4899' } },
        { value: 980,  name: '运动户外', itemStyle: { color: '#3b82f6' } },
        { value: 521,  name: '其他',     itemStyle: { color: '#d1d5db' } },
      ]
    }]
  })
}

// ─── Condition Radar-like ─────────────────────────────────────────────────────
const conditionChartRef = ref(null)

function initConditionChart(el) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e1e2e', borderColor: 'transparent', textStyle: { color: '#e5e7eb' } },
    grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: {
      type: 'category',
      data: ['全新', '95新', '9成新', '8成新', '7成及以下'],
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 }
    },
    series: [{
      type: 'bar', barMaxWidth: 18,
      data: [
        { value: 18420, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#6366f1'},{offset:1,color:'#818cf8'}]) } },
        { value: 32140, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#10b981'},{offset:1,color:'#34d399'}]) } },
        { value: 41280, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#f59e0b'},{offset:1,color:'#fbbf24'}]) } },
        { value: 24560, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#3b82f6'},{offset:1,color:'#60a5fa'}]) } },
        { value: 12056, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#ec4899'},{offset:1,color:'#f472b6'}]) } },
      ],
      label: { show: true, position: 'right', color: '#9ca3af', fontSize: 11, formatter: ({ value }) => value.toLocaleString() },
      borderRadius: [0, 6, 6, 0]
    }]
  })
}

// ─── User Growth ──────────────────────────────────────────────────────────────
const userChartRef = ref(null)

function initUserChart(el) {
  const chart = echarts.init(el)
  const newUsers    = [820, 932, 901, 1290, 1330, 1520, 1680, 1420, 1850, 1760, 2100, 1940]
  const activeUsers = [4200, 4800, 4600, 5800, 6100, 6800, 7200, 6900, 7800, 7400, 8600, 8200]

  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#1e1e2e', borderColor: 'transparent', textStyle: { color: '#e5e7eb' } },
    legend: { top: 0, right: 0, textStyle: { color: '#9ca3af', fontSize: 11 }, itemWidth: 12, itemHeight: 6 },
    grid: { left: 12, right: 12, top: 32, bottom: 20, containLabel: true },
    xAxis: { type: 'category', data: months, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#9ca3af', fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLabel: { color: '#9ca3af', fontSize: 10 } },
    series: [
      {
        name: '新增用户', type: 'bar', barMaxWidth: 14, data: newUsers,
        itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#6366f1'},{offset:1,color:'#c7d2fe'}]) },
        borderRadius: [4,4,0,0]
      },
      {
        name: '活跃用户', type: 'line', data: activeUsers, smooth: true, yAxisIndex: 0,
        lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'none',
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#f59e0b30'},{offset:1,color:'#f59e0b00'}]) }
      }
    ]
  })
}

// ─── Top Category Bar ─────────────────────────────────────────────────────────
const barChartRef = ref(null)

function initBarChart(el) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e1e2e', borderColor: 'transparent', textStyle: { color: '#e5e7eb' } },
    grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: 'category',
      data: ['数码配件', '教材书籍', '潮流衣物', '运动装备', '智能数码'],
      inverse: true, axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 12 }
    },
    series: [{
      type: 'bar', barMaxWidth: 20,
      data: [
        { value: 1280, itemStyle: { color: '#f59e0b' } },
        { value: 960,  itemStyle: { color: '#10b981' } },
        { value: 1480, itemStyle: { color: '#6366f1' } },
        { value: 720,  itemStyle: { color: '#3b82f6' } },
        { value: 1920, itemStyle: { color: '#ec4899' } },
      ],
      label: { show: true, position: 'right', color: '#9ca3af', fontSize: 11, formatter: ({ value }) => value + ' 件' },
      borderRadius: [0, 8, 8, 0]
    }]
  })
}

// ─── Activities ───────────────────────────────────────────────────────────────
const activities = [
  { avatar: '李', user: '李同学',  action: '成功出售了', goods: 'iPad Pro 2022',  price: '3200', time: '刚刚',   color: '#6366f1', type: 'sell', typeLabel: '出售' },
  { avatar: '王', user: '王小明',  action: '求购',       goods: 'Sony WH-1000XM5', price: '1800', time: '2分钟前', color: '#f59e0b', type: 'buy',  typeLabel: '求购' },
  { avatar: '陈', user: '陈薇薇',  action: '换取了',     goods: '机械键盘 87键',   price: '580',  time: '5分钟前', color: '#10b981', type: 'swap', typeLabel: '置换' },
  { avatar: '张', user: '张宇航',  action: '发布了',     goods: '高等数学（上）',  price: '25',   time: '12分钟前',color: '#ec4899', type: 'sell', typeLabel: '出售' },
  { avatar: '刘', user: '刘梦晴',  action: '成功出售了', goods: 'Nike Air Max 270', price: '420',  time: '18分钟前',color: '#3b82f6', type: 'sell', typeLabel: '出售' },
  { avatar: '孙', user: '孙博文',  action: '求购',       goods: '台灯 可调色温',    price: '150',  time: '25分钟前',color: '#8b5cf6', type: 'buy',  typeLabel: '求购' },
]

// ─── Auto Scroll ──────────────────────────────────────────────────────────────
const scrollWrapRef  = ref(null)
const scrollTrackRef = ref(null)
let scrollRaf   = null
let isPaused    = false
let scrollPos   = 0
const SPEED     = 0.5 // px per frame

function startScroll() {
  const wrap  = scrollWrapRef.value
  const track = scrollTrackRef.value
  if (!wrap || !track) return

  // 单份高度 = 全部 items 的一半
  const halfH = track.scrollHeight / 2

  const step = () => {
    if (!isPaused) {
      scrollPos += SPEED
      if (scrollPos >= halfH) scrollPos -= halfH  // 无缝重置
      wrap.scrollTop = scrollPos
    }
    scrollRaf = requestAnimationFrame(step)
  }
  scrollRaf = requestAnimationFrame(step)
}

function pauseScroll()  { isPaused = true  }
function resumeScroll() { isPaused = false }

// ─── CountUp directive ────────────────────────────────────────────────────────
// displayValues 直接驱动数字动画，无需子组件
const displayValues = reactive({})

function runCountUp() {
  kpiList.forEach(({ key, value }) => {
    displayValues[key] = '0'
    const duration = 1800
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      displayValues[key] = Math.round(ease * value).toLocaleString()
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  runCountUp()
  nextTick(() => startScroll())
  trendChart = echarts.init(trendChartRef.value)
  initTrendChart()
  initCategoryChart(categoryChartRef.value)
  initConditionChart(conditionChartRef.value)
  initUserChart(userChartRef.value)
  initBarChart(barChartRef.value)

  const resizeAll = () => {
    ;[trendChart].forEach(c => c?.resize())
    ;[categoryChartRef, conditionChartRef, userChartRef, barChartRef]
      .forEach(r => echarts.getInstanceByDom(r.value)?.resize())
  }
  window.addEventListener('resize', resizeAll)
  onUnmounted(() => { window.removeEventListener('resize', resizeAll); cancelAnimationFrame(scrollRaf) })
})

</script>

<style scoped lang="scss">
/* ── Palette ─────────────────────────────────────────────── */
$bg:      #f8f7f4;
$surface: #ffffff;
$border:  #eeece8;
$text1:   #1c1917;
$text2:   #78716c;
$radius:  14px;

.dashboard {
  background: $bg;
  min-height: 100vh;
  padding: 24px 24px 40px;
  font-family: 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* ── Header ─────────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
}
.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1c1917;
  color: #fef3c7;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.header-title {
  font-size: 28px;
  font-weight: 700;
  color: $text1;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}
.header-sub { font-size: 13px; color: $text2; margin: 0; }

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text2;
  background: $surface;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid $border;
}
.live-dot {
  width: 7px; height: 7px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1.8s ease infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.4); }
}

/* ── KPI Cards ──────────────────────────────────────────── */
.kpi-row { margin-bottom: 16px; }

.kpi-card {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius;
  padding: 20px 18px 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  overflow: hidden;
  transition: transform .2s, box-shadow .2s;
  cursor: default;
  margin-bottom: 16px;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
    border-radius: $radius $radius 0 0;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,.07);
  }
}
.kpi-icon { font-size: 26px; line-height: 1; padding-top: 2px; }
.kpi-body { flex: 1; min-width: 0; }
.kpi-label { font-size: 12px; color: $text2; margin-bottom: 4px; }
.kpi-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 26px;
  font-weight: 700;
  color: $text1;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.kpi-prefix { font-size: 14px; font-weight: 600; color: $text2; }
.kpi-trend {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 500;
  &.up   { color: #10b981; }
  &.down { color: #ef4444; }
}
.kpi-spark {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 36px;
  align-self: center;
}
.spark-bar {
  width: 4px;
  border-radius: 2px;
  background: var(--accent);
  transition: height .3s;
}

/* ── Chart Cards ────────────────────────────────────────── */
.chart-row { margin-bottom: 16px; }

.chart-card {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius;
  padding: 20px;
  height: 100%;
  margin-bottom: 16px;
}
.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.chart-title { font-size: 15px; font-weight: 600; color: $text1; }
.chart-sub   { font-size: 12px; color: $text2; margin-top: 2px; }

.chart-tabs {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 3px;
  border-radius: 8px;
}
.chart-tab {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: $text2;
  transition: all .18s;
  &.active {
    background: #fff;
    color: $text1;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
}
.chart-body {
  width: 100%;
  height: 280px;
}

/* ── Activity Feed ──────────────────────────────────────── */
.activity-scroll-wrap {
  position: relative;
  height: 300px;
  overflow: hidden;
  // 顶部底部渐隐遮罩
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 14%,
    #000 86%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 14%,
    #000 86%,
    transparent 100%
  );
}
.activity-track { display: flex; flex-direction: column; }
.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: background .15s;
  &:hover { background: #fafaf9; }
}
.activity-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.activity-info { flex: 1; min-width: 0; }
.activity-main {
  font-size: 13px;
  color: $text1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.activity-user  { font-weight: 600; }
.activity-action{ color: $text2; margin: 0 3px; }
.activity-goods { color: #6366f1; font-weight: 500; }
.activity-meta  { display: flex; gap: 8px; margin-top: 2px; align-items: center; }
.activity-price { font-size: 13px; font-weight: 700; color: #f59e0b; }
.activity-time  { font-size: 11px; color: #d1ccc8; }
.activity-badge {
  font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 6px;
  flex-shrink: 0;
  &.sell { background: #fef3c7; color: #d97706; }
  &.buy  { background: #d1fae5; color: #059669; }
  &.swap { background: #ede9fe; color: #7c3aed; }
}
</style>
