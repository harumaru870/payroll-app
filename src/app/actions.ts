'use server'

// ↓ さっき作ったファイルから読み込むように変更
import { prisma } from '@/lib/prisma' 
import { revalidatePath } from 'next/cache'
import { addDays, isBefore, isEqual } from 'date-fns'

export async function createEmployee(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const hourlyWage = Number(formData.get('hourlyWage'))
  const transportation = Number(formData.get('transportation'))

  await prisma.user.create({
    data: {
      name,
      email,
      wages: {
        create: {
          hourlyWage,
          transportation,
          effectiveFrom: new Date(),
          isMonthlyTransport: false,
        },
      },
    },
  })

  revalidatePath('/')
  // redirect('/') // ← redirectを削除（同じ画面に留まってリストが更新されるのを見る）
}
// シフト追加の処理
export async function addShift(userId: string, formData: FormData) {
  // フォームから値を取得
  const dateStr = formData.get('date') as string     // 例: "2025-01-01"
  const startStr = formData.get('startTime') as string // 例: "09:00"
  const endStr = formData.get('endTime') as string     // 例: "18:00"
  const breakTime = Number(formData.get('breakTime'))

  // 日付と時間を結合して、Dateオブジェクトを作る（ここがポイント！）
  // new Date("2025-01-01T09:00") のような形式にします
  const startDateTime = new Date(`${dateStr}T${startStr}`)
  let endDateTime = new Date(`${dateStr}T${endStr}`)
  const dateOnly = new Date(dateStr)

  // 【修正】終了時刻が開始時刻以前なら、翌日とみなす（日またぎ対応）
  if (!isBefore(startDateTime, endDateTime)) {
    endDateTime = addDays(endDateTime, 1)
  }

  await prisma.shift.create({
    data: {
      userId,
      date: dateOnly,
      startTime: startDateTime,
      endTime: endDateTime,
      breakTime,
    },
  })

  // そのユーザーのページを更新
  revalidatePath(`/employees/${userId}`)
}

// シフト更新の処理
export async function updateShift(shiftId: string, userId: string, formData: FormData) {
  const dateStr = formData.get('date') as string
  const startStr = formData.get('startTime') as string
  const endStr = formData.get('endTime') as string
  const breakTime = Number(formData.get('breakTime'))

  const startDateTime = new Date(`${dateStr}T${startStr}`)
  let endDateTime = new Date(`${dateStr}T${endStr}`)
  const dateOnly = new Date(dateStr)

  // 日またぎ対応
  if (!isBefore(startDateTime, endDateTime)) {
    endDateTime = addDays(endDateTime, 1)
  }

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      date: dateOnly,
      startTime: startDateTime,
      endTime: endDateTime,
      breakTime,
    },
  })

  revalidatePath(`/employees/${userId}`)
}

// シフト削除の処理
export async function deleteShift(shiftId: string, userId: string) {
  await prisma.shift.delete({
    where: { id: shiftId },
  })

  // 画面を更新
  revalidatePath(`/employees/${userId}`)
}

// 時給の改定（新しい設定を追加）
export async function updateWage(userId: string, formData: FormData) {
  const hourlyWage = Number(formData.get('hourlyWage'))
  const transportation = Number(formData.get('transportation'))
  const effectiveFromStr = formData.get('effectiveFrom') as string

  // 日付入力は00:00になるため、同日内で古い設定に負けないよう終端時刻に寄せる
  const effectiveFrom = effectiveFromStr
    ? new Date(`${effectiveFromStr}T23:59:59.999`)
    : new Date()

  // 同日の設定が既にあるか確認（修正用）
  const existingWage = await prisma.wageSetting.findFirst({
    where: {
      userId,
      effectiveFrom,
    },
  })

  if (existingWage) {
    // 既にある場合は更新
    await prisma.wageSetting.update({
      where: { id: existingWage.id },
      data: {
        hourlyWage,
        transportation,
      },
    })
  } else {
    // なければ新規作成
    await prisma.wageSetting.create({
      data: {
        userId,
        hourlyWage,
        transportation,
        effectiveFrom,
        isMonthlyTransport: false,
      },
    })
  }

  revalidatePath(`/employees/${userId}`)
}