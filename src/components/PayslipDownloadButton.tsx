'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import PayslipDocument from './PayslipDocument'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

type PayslipData = {
  employeeName: string
  period: string 
  periodStart: string
  periodEnd: string
  hourlyWage: number
  daysWorked: number
  totalHours: number
  nightHours: number
  basePay: number
  nightAllowance: number
  transportation: number
  totalPay: number
  issuedDate: string
  shifts: {
    date: Date
    startTime: Date
    endTime: Date
    totalMinutes: number
    nightMinutes: number
  }[]
}

export default function PayslipDownloadButton({ 
  data, 
  fileName 
}: { 
  data: PayslipData, 
  fileName: string 
}) {
  const [isClient, setIsClient] = useState(false)
  const [shouldGenerate, setShouldGenerate] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <button className="text-gray-400 text-sm font-bold cursor-not-allowed">準備中...</button>
  }

  // まだ生成ボタンを押していない時
  if (!shouldGenerate) {
    return (
      <button 
        onClick={(e) => {
          e.preventDefault() // Linkのクリックイベントと競合しないように
          e.stopPropagation()
          setShouldGenerate(true)
        }}
        className="inline-flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded transition-colors"
      >
        PDFを作成
      </button>
    )
  }

  // 生成ボタンを押した後
  return (
    <div onClick={(e) => {
        // ダウンロードリンククリック時のイベント伝播を止める
        e.stopPropagation() 
      }}>
      <PDFDownloadLink
        document={<PayslipDocument data={data} />}
        fileName={fileName}
        className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors"
      >
        {({ loading }) => 
          loading ? '作成中...' : 'ダウンロード'
        }
      </PDFDownloadLink>
    </div>
  )
}
