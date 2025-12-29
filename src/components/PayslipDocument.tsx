'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

// 日本語フォントを登録（ローカルのpublicフォルダから読み込み）
Font.register({
  family: 'Noto Sans JP',
  fonts: [
    {
      src: '/fonts/NotoSansJP-Regular.woff',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/NotoSansJP-Bold.woff',
      fontWeight: 'bold',
    },
  ],
})

// スタイル定義（モダンでクリーンなCSS風）
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Noto Sans JP',
    backgroundColor: '#FFFFFF',
    color: '#1F2937', // gray-800
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB', // blue-600
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 10,
    color: '#6B7280', // gray-500
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB', // blue-600
  },
  period: {
    fontSize: 14,
    color: '#374151', // gray-700
  },
  employeeInfo: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#F3F4F6', // gray-100
    borderRadius: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280', // gray-500
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // gray-200
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB', // gray-50
  },
  label: {
    fontSize: 10,
    color: '#4B5563', // gray-600
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#111827', // gray-900
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB', // blue-600
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  }
})

// 型定義
type PayslipData = {
  employeeName: string
  period: string // "2025-01"
  periodStart: string // "2024-12-26"
  periodEnd: string   // "2025-01-25"
  hourlyWage: number
  daysWorked: number
  totalHours: number // 分
  nightHours: number // 分
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

export default function PayslipDocument({ data }: { data: PayslipData }) {
  // 分を「何時間何分」表記に変換
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}時間${m > 0 ? ` ${m}分` : ''}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* ヘッダー */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>PAYROLL APP INC.</Text>
            <Text style={styles.title}>給与明細書</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.period}>{data.period} 分</Text>
            <Text style={{ fontSize: 9, color: '#6B7280' }}>
              ({data.periodStart.replace(/-/g, '/')} - {data.periodEnd.replace(/-/g, '/')})
            </Text>
          </View>
        </View>

        {/* 従業員情報 */}
        <View style={styles.employeeInfo}>
          <Text style={styles.label}>氏名</Text>
          <Text style={styles.employeeName}>{data.employeeName} 殿</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
          {/* 左カラム：勤怠 */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>勤怠実績</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>出勤日数</Text>
              <Text style={styles.value}>{data.daysWorked} 日</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>総労働時間</Text>
              <Text style={styles.value}>{formatTime(data.totalHours)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>うち深夜時間</Text>
              <Text style={styles.value}>{formatTime(data.nightHours)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>適用時給</Text>
              <Text style={styles.value}>¥{data.hourlyWage.toLocaleString()}</Text>
            </View>
          </View>

          {/* 右カラム：支給 */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>支給明細</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>基本給（通常）</Text>
              <Text style={styles.value}>¥{data.basePay.toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>深夜手当（割増分）</Text>
              <Text style={styles.value}>¥{data.nightAllowance.toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>交通費</Text>
              <Text style={styles.value}>¥{data.transportation.toLocaleString()}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>総支給額</Text>
              <Text style={styles.totalValue}>¥{data.totalPay.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        
        {/* 勤務明細テーブル */}
        <Text style={styles.sectionTitle}>勤務明細</Text>
        <View style={{ marginTop: 5 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 5, marginBottom: 5 }}>
            <Text style={{ width: '20%', fontSize: 8, color: '#6B7280' }}>日付</Text>
            <Text style={{ width: '40%', fontSize: 8, color: '#6B7280' }}>時間</Text>
            <Text style={{ width: '20%', fontSize: 8, color: '#6B7280', textAlign: 'right' }}>時間数</Text>
            <Text style={{ width: '20%', fontSize: 8, color: '#6B7280', textAlign: 'right' }}>深夜</Text>
          </View>
          {data.shifts.map((shift, index) => (
            <View key={index} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ width: '20%', fontSize: 9 }}>{format(new Date(shift.date), 'MM/dd')}</Text>
              <Text style={{ width: '40%', fontSize: 9 }}>
                {format(new Date(shift.startTime), 'HH:mm')} - {shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : ''}
              </Text>
              <Text style={{ width: '20%', fontSize: 9, textAlign: 'right' }}>
                {(shift.totalMinutes / 60).toFixed(1)}h
              </Text>
              <Text style={{ width: '20%', fontSize: 9, textAlign: 'right', color: shift.nightMinutes > 0 ? '#DC2626' : '#1F2937' }}>
                {shift.nightMinutes > 0 ? `${(shift.nightMinutes / 60).toFixed(1)}h` : '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text>発行日: {data.issuedDate} | この明細書は Payroll App によって自動生成されました。</Text>
        </View>

      </Page>
    </Document>
  )
}
