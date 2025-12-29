'use client'

import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { calculateShiftDuration, calculatePay, WageSetting, getWageForDate } from '@/utils/payroll'
import { deleteShift, updateShift } from '@/app/actions'

type Shift = {
  id: string
  date: Date
  startTime: Date
  endTime: Date | null
  breakTime: number
}

type Props = {
  shifts: Shift[]
  wages: WageSetting[]
  employeeId: string
  selectedMonth?: string
}

export default function ShiftHistoryTable({ shifts, wages, employeeId, selectedMonth }: Props) {
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  // 編集モーダルを閉じる
  const closeEdit = () => setEditingShift(null)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-900 border-b border-gray-200">
            <th className="p-3 rounded-l font-bold">日付</th>
            <th className="p-3 font-bold">時間</th>
            <th className="p-3 font-bold">内訳</th>
            <th className="p-3 font-bold text-right">支給額</th>
            <th className="p-3 rounded-r w-24"></th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => {
            const start = new Date(shift.startTime)
            const end = shift.endTime ? new Date(shift.endTime) : new Date()
            
            const duration = calculateShiftDuration(start, end, shift.breakTime)
            const wageSetting = getWageForDate(wages, new Date(shift.startTime))
            const hourlyWageForDay = wageSetting?.hourlyWage || 0
            const pay = calculatePay(duration, hourlyWageForDay)

            // 削除アクションのバインド
            const deleteAction = deleteShift.bind(null, shift.id, employeeId)

            return (
              <tr key={shift.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                  {format(new Date(shift.date), 'MM/dd (EEE)')}
                </td>
                <td className="p-3 text-gray-800 whitespace-nowrap">
                  {format(start, 'HH:mm')} - {shift.endTime ? format(end, 'HH:mm') : '??'}
                  {shift.endTime && !isSameDay(start, end) && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 ml-1 px-1 rounded font-bold">
                      +1日
                    </span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="text-xs text-gray-600 font-medium">通常: {(duration.normalMinutes / 60).toFixed(1)}h</div>
                  {duration.nightMinutes > 0 && (
                    <div className="text-xs text-red-600 font-bold">深夜: {(duration.nightMinutes / 60).toFixed(1)}h</div>
                  )}
                </td>
                <td className="p-3 font-bold text-right text-gray-900 whitespace-nowrap">
                  ¥{pay.toLocaleString()}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingShift(shift)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                    >
                      編集
                    </button>
                    <form action={deleteAction}>
                      <button 
                        type="submit" 
                        className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 rounded hover:bg-red-50"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            )
          })}
          {shifts.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                この月のデータはありません
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 編集モーダル */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">シフト編集</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            
            <form 
              action={async (formData) => {
                await updateShift(editingShift.id, employeeId, formData)
                closeEdit()
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">日付</label>
                <input 
                  type="date" 
                  name="date" 
                  defaultValue={format(new Date(editingShift.date), 'yyyy-MM-dd')}
                  required 
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">開始</label>
                  <input 
                    type="time" 
                    name="startTime" 
                    defaultValue={format(new Date(editingShift.startTime), 'HH:mm')}
                    required 
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">終了</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    defaultValue={editingShift.endTime ? format(new Date(editingShift.endTime), 'HH:mm') : ''}
                    required 
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">休憩 (分)</label>
                <input 
                  type="number" 
                  name="breakTime" 
                  defaultValue={editingShift.breakTime}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={closeEdit}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-bold hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow-sm transition-colors"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
