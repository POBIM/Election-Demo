import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="w-full bg-white shadow-sm border-b border-slate-200">
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#EF3340]"></div>
          <div className="h-full w-1/3 bg-white"></div>
          <div className="h-full w-1/3 bg-[#00247D]"></div>
        </div>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold text-xs">
              ECT
            </div>
            <h1 className="text-lg font-bold text-blue-900">
              ระบบเลือกตั้งไทย
            </h1>
          </div>
          <nav>
            <Button variant="ghost" asChild>
              <Link href="/auth/login">เจ้าหน้าที่</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 md:py-24 flex flex-col items-center text-center max-w-4xl">
        <div className="mb-8 p-3 bg-blue-50 text-blue-800 rounded-full text-sm font-medium px-6 border border-blue-100">
          การเลือกตั้งทั่วไป พ.ศ. 2569
        </div>
        
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
          โปร่งใส ตรวจสอบได้ <br />
          <span className="text-blue-700">เพื่อระบอบประชาธิปไตย</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl leading-relaxed">
          ยินดีต้อนรับสู่ระบบเลือกตั้งอิเล็กทรอนิกส์อย่างเป็นทางการ 
          ออกแบบมาเพื่อความปลอดภัยสูงสุดและความสะดวกสบายของประชาชน
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center group">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
              🗳️
            </div>
            <h3 className="text-xl font-bold mb-2">ลงคะแนนเสียง</h3>
            <p className="text-slate-500 mb-6 text-sm">
              ใช้สิทธิเลือกตั้งของคุณผ่านระบบออนไลน์
            </p>
            <Button size="lg" className="w-full bg-red-600 hover:bg-red-700" asChild>
              <Link href="/vote">เข้าคูหาออนไลน์</Link>
            </Button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center group">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-xl font-bold mb-2">ผลการเลือกตั้ง</h3>
            <p className="text-slate-500 mb-6 text-sm">
              ตรวจสอบผลคะแนนแบบเรียลไทม์
            </p>
            <Button size="lg" variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
              <Link href="/results">ดูผลคะแนน</Link>
            </Button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center group">
            <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
              🔐
            </div>
            <h3 className="text-xl font-bold mb-2">ตรวจสอบสิทธิ</h3>
            <p className="text-slate-500 mb-6 text-sm">
              ตรวจสอบรายชื่อและหน่วยเลือกตั้ง
            </p>
            <Button size="lg" variant="secondary" className="w-full" asChild>
              <Link href="/check-status">ตรวจสอบ</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-12">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="mb-4">© 2026 สำนักงานคณะกรรมการการเลือกตั้ง (กกต.)</p>
          <div className="flex justify-center gap-6">
            <Link href="#" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
            <Link href="#" className="hover:text-white transition-colors">เงื่อนไขการใช้งาน</Link>
            <Link href="#" className="hover:text-white transition-colors">ติดต่อเรา</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
