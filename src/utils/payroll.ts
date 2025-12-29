import { differenceInMinutes, addDays, isBefore, startOfDay, addHours,addMinutes } from 'date-fns'

// 給与計算の結果を表す型
type ShiftDuration = {
  totalMinutes: number   // 総労働時間（分）
  normalMinutes: number  // 通常時間（分）
  nightMinutes: number   // 深夜時間（分）
}

// 型定義を追加
export type WageSetting = {
  id: string
  hourlyWage: number
  transportation: number
  effectiveFrom: Date
}

export function calculateShiftDuration(
  startTime: Date, 
  endTime: Date, 
  breakMinutes: number
): ShiftDuration {
  
  // 1. まず単純な引き算で総時間を出す
  let total = differenceInMinutes(endTime, startTime) - breakMinutes
  if (total < 0) total = 0 // マイナスになったら0にする（安全策）

  // 2. 深夜時間の計算
  // 基本ルール: 22:00 〜 翌05:00 が深夜
  let night = 0
  
  // 計算用に時間をコピー
  let current = new Date(startTime)
  const end = new Date(endTime)

  // 1分ずつ進めながら「今は深夜か？」を判定するループ
  // (もっと賢い数学的な計算方法もありますが、バグが出にくいこの方法が確実です)
  while (isBefore(current, end)) {
    const hour = current.getHours()
    
    // 22時〜23時、または 0時〜4時なら深夜
    const isNight = hour >= 22 || hour < 5
    
    if (isNight) {
      night++
    }
    
    // 1分進める
    current = addMinutes(current, 1) 
  }

  // 休憩時間は「通常時間」から優先して引くか、「深夜」から引くか？
  // 法律的には「休憩は労働時間ではない」ので、どちらの時間帯に休憩を取ったかによりますが、
  // 簡易的に「深夜時間からは引かない（深夜労働は実働でカウント）」とするのが一般的です。
  // ただし、総労働時間を超えて深夜時間がカウントされることはないので調整します。
  
  if (night > total) night = total // 深夜時間が総時間を超えないように
  
  const normal = total - night

  return {
    totalMinutes: total,
    normalMinutes: normal,
    nightMinutes: night
  }
}

// 金額計算の関数
export function calculatePay(
  duration: ShiftDuration, 
  hourlyWage: number
) {
  const normalPay = (duration.normalMinutes / 60) * hourlyWage
  const nightPay = (duration.nightMinutes / 60) * (hourlyWage * 1.25) // 1.25倍！
  
  return Math.floor(normalPay + nightPay) // 端数は切り捨て
}

// 締め日の設定（25日締め）
const CLOSING_DAY = 25

// 月ごとの集計データの型定義
type MonthlySummary = {
  monthStr: string      // "2025-01" のようなキー（支給月）
  periodStart: string   // 集計期間開始日 "2024-12-26"
  periodEnd: string     // 集計期間終了日 "2025-01-25"
  totalPay: number      // 給与総額
  basePay: number       // 基本給（時間×時給）
  nightAllowance: number // 深夜割増分（深夜時間×時給×0.25）
  totalTransport: number // 交通費総額
  totalHours: number    // 総労働時間（分）
  nightHours: number    // 深夜労働時間（分）
  daysWorked: number    // 出勤日数
  hourlyWage: number    // 代表時給（その月の最後の日の時給を採用）
  shifts: any[]         // シフト詳細リスト
}

export function aggregateByMonth(shifts: any[], wages: WageSetting[]): MonthlySummary[] {
  const groups: { [key: string]: MonthlySummary } = {}

  for (const shift of shifts) {
    // 日付から締め日を考慮した "2025-01" のようなキーを作る
    const date = new Date(shift.date)
    let targetMonth = new Date(date)
    
    // もし日付が締め日より後なら、翌月分として扱う
    if (date.getDate() > CLOSING_DAY) {
      targetMonth.setMonth(targetMonth.getMonth() + 1)
    }
    
    const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`

    // 集計期間の計算（前月26日 〜 当月25日）
    const periodEnd = new Date(targetMonth)
    periodEnd.setDate(CLOSING_DAY)
    const periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)
    periodStart.setDate(CLOSING_DAY + 1)

    const wageSetting = getWageForDate(wages, date)
    const hourlyWage = wageSetting?.hourlyWage || 0
    const transport = wageSetting?.transportation || 0

    // その月のデータがまだ無ければ初期化
    if (!groups[monthKey]) {
      groups[monthKey] = {
        monthStr: monthKey,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        totalPay: 0,
        basePay: 0,
        nightAllowance: 0,
        totalTransport: 0,
        totalHours: 0,
        nightHours: 0,
        daysWorked: 0,
        hourlyWage: hourlyWage, // とりあえず最初の日の時給を入れる
        shifts: []
      }
    }
    // 月内の最新の時給で上書きしておく（簡易的対応）
    groups[monthKey].hourlyWage = hourlyWage

    // 計算
    const start = new Date(shift.startTime)
    const end = shift.endTime ? new Date(shift.endTime) : new Date()
    const duration = calculateShiftDuration(start, end, shift.breakTime)
    
    // 詳細計算
    // 基本給部分 = 総時間 * 時給
    const base = (duration.totalMinutes / 60) * hourlyWage
    // 深夜割増部分 = 深夜時間 * 時給 * 0.25
    const allowance = (duration.nightMinutes / 60) * (hourlyWage * 0.25)
    
    // 合計（端数処理は最後にするのが理想だが、日毎計算の場合はここで床関数）
    // 既存ロジックと合わせるため、日毎に切り捨てて加算する
    const pay = Math.floor(base + allowance)

    // 集計に加算
    groups[monthKey].totalPay += pay
    groups[monthKey].basePay += Math.floor(base) // ※ここも目安として加算
    groups[monthKey].nightAllowance += Math.floor(allowance)
    
    groups[monthKey].totalHours += duration.totalMinutes
    groups[monthKey].nightHours += duration.nightMinutes
    groups[monthKey].daysWorked += 1
    // 交通費を加算（1日1回）
    groups[monthKey].totalTransport += transport
    
    // シフト詳細を追加（PDF用）
    groups[monthKey].shifts.push({
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakTime: shift.breakTime,
      totalMinutes: duration.totalMinutes,
      nightMinutes: duration.nightMinutes,
      pay: pay
    })
  }

  // オブジェクトを配列にして、日付順（新しい順）に並べ替え
  const sortedGroups = Object.values(groups).sort((a, b) => b.monthStr.localeCompare(a.monthStr))
  
  // 各月ごとのシフトも日付順に並べ替え（古い順）
  for (const group of sortedGroups) {
    group.shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return sortedGroups
}

// 年収の進捗計算用
export function calculateYearlyProgress(shifts: any[], wages: WageSetting[]) {
  const now = new Date()
  const currentYear = now.getFullYear()

  let yearlyTotal = 0

  for (const shift of shifts) {
    const shiftDate = new Date(shift.date)
    if (shiftDate.getFullYear() === currentYear) {
      const wageSetting = getWageForDate(wages, shiftDate)
      const hourlyWage = wageSetting?.hourlyWage || 0
      const start = new Date(shift.startTime)
      const end = shift.endTime ? new Date(shift.endTime) : new Date()
      const duration = calculateShiftDuration(start, end, shift.breakTime)
      yearlyTotal += calculatePay(duration, hourlyWage)
    }
  }

  const limit = 1030000 // 103万円
  const remaining = limit - yearlyTotal
  const percentage = Math.min((yearlyTotal / limit) * 100, 100)

  return {
    year: currentYear,
    total: yearlyTotal,
    remaining,
    percentage,
    isSafe: remaining > 0,
  }
}

// 指定された日付時点での給与設定を探す関数
export function getWageForDate(wages: WageSetting[], targetDate: Date): WageSetting | null {
  const sortedWages = [...wages].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  )

  const normalize = (d: Date) => {
    const t = new Date(d)
    t.setHours(0, 0, 0, 0)
    return t.getTime()
  }

  const targetTs = normalize(targetDate)
  const match = sortedWages.find((w) => normalize(new Date(w.effectiveFrom)) <= targetTs)

  return match || (sortedWages.length ? sortedWages[sortedWages.length - 1] : null)
}