import Link from 'next/link' // ← これを追加！
import { unstable_noStore as noStore } from 'next/cache'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { createEmployee } from './actions'
import { prisma } from '@/lib/prisma' // DB接続を読み込み

export const dynamic = 'force-dynamic' // これを追加！常に最新データを取得するようになります

// async をつけるのがポイント！
export default async function Home() {
  noStore()

  const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
  const employees = isBuildPhase
    ? []
    : await prisma.user.findMany({
        include: {
          wages: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="bg-white p-8 rounded-lg shadow-md h-fit">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">従業員登録</h1>
          <form action={createEmployee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">名前</label>
              <input name="name" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" placeholder="山田 太郎"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
              <input name="email" type="email" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" placeholder="tarou@example.com"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">時給 (円)</label>
                <input name="hourlyWage" type="number" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" placeholder="1200"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">交通費 (円)</label>
                <input name="transportation" type="number" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" placeholder="500"/>
              </div>
            </div>
            <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              登録する
            </button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">従業員一覧 ({employees.length}名)</h2>
          
          <div className="space-y-4">
            {employees.length === 0 ? (
              <p className="text-gray-500">まだ登録されていません。</p>
            ) : (
              employees.map((emp) => {
                const currentWage = emp.wages[0]
                
                return (
                  <div key={emp.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link 
                          href={`/employees/${emp.id}`} 
                          className="font-bold text-lg text-blue-600 hover:underline"
                        >
                          {emp.name}
                        </Link>
                        <p className="text-gray-500 text-sm">{emp.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">¥{currentWage?.hourlyWage.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">時給</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
