'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css' // デフォルトのスタイルを読み込む
import { format, isSameDay } from 'date-fns'

type Shift = {
  id: string
  date: Date
  startTime: Date
  endTime: Date | null
  breakTime: number
}

export default function ShiftCalendar({ shifts }: { shifts: Shift[] }) {
  const [value, setValue] = useState<any>(new Date())

  // カレンダーの日付セルにコンテンツを追加する関数
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null

    // その日のシフトを探す
    const shift = shifts.find((s) => isSameDay(new Date(s.date), date))

    if (!shift) return null

    const start = new Date(shift.startTime)
    const end = shift.endTime ? new Date(shift.endTime) : null
    
    // シフトがある日の表示
    return (
      <div className="text-xs mt-1 bg-blue-50 text-blue-700 rounded p-1 text-center">
        <div className="font-bold">
          {format(start, 'HH:mm')}
        </div>
        {end && (
          <div className="text-[10px] text-blue-500">
            ~{format(end, 'HH:mm')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md flex justify-center">
      <Calendar
        onChange={setValue}
        value={value}
        tileContent={tileContent}
        locale="ja-JP" // 日本語化
      />
    </div>
  )
}
