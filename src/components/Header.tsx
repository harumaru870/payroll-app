import Link from 'next/link'

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* 左側：ロゴ・アプリ名 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              {/* アイコン（四角いロゴ風） */}
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-lg group-hover:bg-blue-700 transition-colors">
                P
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">
                Payroll App
              </span>
            </Link>
          </div>

          {/* 右側：ナビゲーション（将来用） */}
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              従業員一覧
            </Link>
            {/* まだ機能はないけど、あるっぽく見せるリンク */}
            <span className="text-sm font-medium text-gray-300 cursor-not-allowed">
              設定
            </span>
          </nav>
        </div>
      </div>
    </header>
  )
}