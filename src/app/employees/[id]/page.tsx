import { prisma } from '@/lib/prisma'
import { addShift, updateWage } from '@/app/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns' // 日付を綺麗に表示するライブラリ
import { aggregateByMonth, calculateYearlyProgress, getWageForDate } from '@/utils/payroll'
import ShiftCalendar from '@/components/ShiftCalendar'
import PayslipDownloadButton from '@/components/PayslipDownloadButton'
import ShiftHistoryTable from '@/components/ShiftHistoryTable'

// Propsとして params, searchParams が渡ってきます
export default async function EmployeePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ month?: string }>
}) {
  // Next.js 15では params, searchParams は Promise なので await します
  const { id } = await params
  const { month: selectedMonth } = await searchParams

  // IDを使ってDBから従業員情報を取得
  const employee = await prisma.user.findUnique({
    where: { id },
    include: {
      shifts: {
        orderBy: { date: 'desc' }, // 新しい順に取得
      },
      wages: true,
    },
  })

  // もしIDが間違っていて見つからなければ 404 ページへ
  if (!employee) return notFound()

  const wagesSorted = [...employee.wages].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  )
  const latestWage = wagesSorted[0]
  const currentWage = getWageForDate(wagesSorted, new Date())
  
  const monthlySummaries = aggregateByMonth(employee.shifts, wagesSorted)
  const yearlyInfo = calculateYearlyProgress(employee.shifts, wagesSorted)

  // 選択された月でシフトをフィルタリング（25日締め対応）
  const filteredShifts = selectedMonth
    ? employee.shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        const [year, month] = selectedMonth.split('-').map(Number)
        
        // ターゲット月の25日
        const periodEnd = new Date(year, month - 1, 25)
        // ターゲット月の前月26日
        const periodStart = new Date(year, month - 2, 26)
        
        // 期間内かどうか判定
        // setHoursで時間を正規化して比較
        shiftDate.setHours(0,0,0,0)
        periodEnd.setHours(0,0,0,0)
        periodStart.setHours(0,0,0,0)
        
        return shiftDate >= periodStart && shiftDate <= periodEnd
      })
    : employee.shifts

  // シフト登録用のAction（IDを埋め込むための小技）
  // bindを使うことで、hidden inputを使わずにIDを渡せます
  const addShiftWithId = addShift.bind(null, employee.id)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダー部分 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name} さんの管理</h1>
            <p className="text-gray-700">{employee.email}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-700">現在の時給</div>
            <div className="text-xl font-bold text-blue-600">¥{currentWage?.hourlyWage}</div>
          </div>
        </div>
        {/* 年収の壁（103万円）メーター */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-indigo-500">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="font-bold text-lg text-gray-900">
                {yearlyInfo.year}年の扶養範囲 (103万円)
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                現在: <span className="font-bold text-gray-900">¥{yearlyInfo.total.toLocaleString()}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">残り枠</p>
              <p className={`text-2xl font-bold ${yearlyInfo.isSafe ? 'text-indigo-600' : 'text-red-600'}`}>
                ¥{yearlyInfo.remaining.toLocaleString()}
              </p>
            </div>
          </div>

          {/* プログレスバー本体 */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                yearlyInfo.percentage > 90 ? 'bg-red-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${yearlyInfo.percentage}%` }}
            ></div>
          </div>
          
          <p className="text-right text-xs text-gray-400 mt-1">
            {yearlyInfo.percentage.toFixed(1)}% 消費
          </p>
        </div>

        {/* カレンダー表示エリア (New!) */}
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-4 text-gray-900">シフトカレンダー</h2>
          <ShiftCalendar shifts={employee.shifts} />
        </div>

        {/* 月次給与サマリー (New!) */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-bold text-lg text-gray-800">月別の支給額</h2>
            {selectedMonth && (
              <Link href={`/employees/${employee.id}`} className="text-sm text-blue-600 hover:underline" scroll={false}>
                すべての月を表示
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {monthlySummaries.map((summary) => {
              const isSelected = summary.monthStr === selectedMonth
              
              // PDF用のデータを作成
              const payslipData = {
                employeeName: employee.name,
                period: summary.monthStr,
                periodStart: summary.periodStart,
                periodEnd: summary.periodEnd,
                hourlyWage: summary.hourlyWage,
                daysWorked: summary.daysWorked,
                totalHours: summary.totalHours,
                nightHours: summary.nightHours,
                basePay: summary.basePay,
                nightAllowance: summary.nightAllowance,
                transportation: summary.totalTransport,
                totalPay: summary.totalPay + summary.totalTransport,
                issuedDate: format(new Date(), 'yyyy/MM/dd'),
                shifts: summary.shifts
              }

              return (
                <div 
                  key={summary.monthStr} 
                  className={`flex flex-col bg-white rounded-lg shadow border transition-colors ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'
                  }`}
                >
                  <Link 
                    href={isSelected ? `/employees/${employee.id}` : `/employees/${employee.id}?month=${summary.monthStr}`}
                    className="p-5 flex-grow hover:bg-gray-50 rounded-t-lg block"
                    scroll={false}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className={`font-bold text-xl ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {summary.monthStr}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {summary.daysWorked}日出勤
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">基本給+深夜:</span>
                        <span className="font-bold">¥{summary.totalPay.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">交通費:</span>
                        <span className="font-bold">¥{summary.totalTransport.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between items-baseline">
                        <span className="font-bold text-gray-700">総支給額:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ¥{(summary.totalPay + summary.totalTransport).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* PDFダウンロードボタン */}
                  <div className="px-5 pb-4 pt-0 text-right border-t border-gray-100 mt-auto bg-gray-50 rounded-b-lg p-2">
                    <PayslipDownloadButton 
                      data={payslipData} 
                      fileName={`payslip_${employee.name}_${summary.monthStr}.pdf`} 
                    />
                  </div>
                </div>
              )
            })}
            
            {monthlySummaries.length === 0 && (
              <p className="text-gray-600 text-sm">シフトデータがありません</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 左側：シフト入力フォーム */}
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
            <h2 className="font-bold text-lg mb-4 text-gray-900">シフト入力</h2>
            <form action={addShiftWithId} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">日付</label>
                <input type="date" name="date" required className="w-full border border-gray-300 rounded p-2"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">開始</label>
                  <input type="time" name="startTime" required className="w-full border border-gray-300 rounded p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">終了</label>
                  <input type="time" name="endTime" required className="w-full border border-gray-300 rounded p-2"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">休憩 (分)</label>
                <input type="number" name="breakTime" defaultValue="0" className="w-full border border-gray-300 rounded p-2"/>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow-sm">
                追加
              </button>
            </form>
          </div>

          {/* 右側：シフト履歴リスト */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-900">
                勤務履歴
                {selectedMonth && <span className="ml-2 text-blue-600 text-base">({selectedMonth})</span>}
              </h2>
              {selectedMonth && (
                <Link href={`/employees/${employee.id}`} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded" scroll={false}>
                  全期間表示に戻す
                </Link>
              )}
            </div>
            
            <ShiftHistoryTable 
              shifts={filteredShifts} 
              wages={wagesSorted} 
              employeeId={employee.id} 
              selectedMonth={selectedMonth}
            />

            {/* 昇給・条件変更フォーム */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md border-t-4 border-yellow-400">
              <h2 className="font-bold text-lg mb-4 text-gray-900">給与条件の変更（昇給など）</h2>
              
              {/* 給与履歴リスト */}
              <div className="mb-6 bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <h3 className="font-bold text-sm text-gray-700 mb-3">設定履歴</h3>
                <div className="space-y-2">
                  {wagesSorted.map((wage) => {
                    const isCurrent = currentWage?.id === wage.id
                    const isFuture = new Date(wage.effectiveFrom) > new Date()
                    
                    return (
                      <div key={wage.id} className={`flex justify-between items-center p-2 rounded ${isCurrent ? 'bg-white shadow-sm border-l-4 border-blue-500' : 'border-b border-yellow-200 last:border-0'}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-gray-600 text-sm">
                            {format(new Date(wage.effectiveFrom), 'yyyy/MM/dd')} 〜
                          </span>
                          <span className="font-bold text-gray-800">
                            ¥{wage.hourlyWage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500 text-xs">交通費: ¥{wage.transportation.toLocaleString()}</span>
                          {isCurrent && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">適用中</span>
                          )}
                          {isFuture && (
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">予定</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                新しい時給と、いつから適用するかを入力してください。<br/>
                過去の日付を指定すると、過去の給与計算も自動的に再計算されます。<br/>
                <span className="text-xs text-gray-400">※未来の日付を指定した場合、その日から自動的に適用されます。</span>
              </p>
              
              <form action={updateWage.bind(null, employee.id)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">適用開始日</label>
                  <input type="date" name="effectiveFrom" required className="w-full border border-gray-300 rounded p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">新・時給</label>
                  <input type="number" name="hourlyWage" required defaultValue={latestWage?.hourlyWage} placeholder="例: 1300" className="w-full border border-gray-300 rounded p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">交通費</label>
                  <input type="number" name="transportation" required defaultValue={latestWage?.transportation} className="w-full border border-gray-300 rounded p-2"/>
                </div>
                
                <button type="submit" className="md:col-span-3 w-full bg-yellow-500 text-white font-bold py-2 rounded hover:bg-yellow-600 shadow-sm">
                  条件を更新する
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}