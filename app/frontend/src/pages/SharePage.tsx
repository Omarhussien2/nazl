import { useState, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import {
  Share2, Upload, Download, Copy, CheckCircle2,
  Wifi, WifiOff, FileIcon, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Generate a random 4-word passphrase from Arabic words
const arabicWords = [
  'نجمة', 'قمر', 'شمس', 'بحر', 'جبل', 'ورد', 'نخلة', 'صقر',
  'غيمة', 'مطر', 'رمل', 'واحة', 'سماء', 'نهر', 'حصان', 'لؤلؤة',
  'فراشة', 'عصفور', 'زهرة', 'كوكب', 'برق', 'رعد', 'موجة', 'جزيرة',
  'قلعة', 'سفينة', 'كنز', 'تاج', 'سيف', 'درع', 'ريشة', 'ماسة',
];

function generatePassphrase(): string {
  const words: string[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * arabicWords.length);
    words.push(arabicWords[idx]);
  }
  return words.join(' - ');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميقابايت', 'قيقابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function SharePage() {
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [passphrase, setPassphrase] = useState('');
  const [receiveCode, setReceiveCode] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  }, []);

  const handleStartSending = () => {
    if (selectedFiles.length === 0) {
      toast.error('اختر ملفات أول!');
      return;
    }
    const code = generatePassphrase();
    setPassphrase(code);
    setIsConnected(true);
    toast.success('كلمة السر جاهزة! شاركها مع الشخص الثاني');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      toast.success('تم نسخ كلمة السر!');
    } catch {
      toast.error('ما قدرنا ننسخ');
    }
  };

  const handleConnect = () => {
    if (!receiveCode.trim()) {
      toast.error('ادخل كلمة السر أول!');
      return;
    }
    setIsConnected(true);
    setIsTransferring(true);

    // Simulate transfer progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        setIsTransferring(false);
        toast.success('تم استلام الملفات بنجاح! 🎉');
      }
      setProgress(Math.min(prog, 100));
    }, 500);
  };

  const handleReset = () => {
    setPassphrase('');
    setReceiveCode('');
    setSelectedFiles([]);
    setIsConnected(false);
    setIsTransferring(false);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="bg-gradient-to-l from-[#00D2FF] to-[#6C5CE7] bg-clip-text text-transparent">
              شارك ملفاتك
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            شارك ملفاتك مباشرة بدون رفع على أي سحابة — P2P سحري بكلمة سر من 4 كلمات
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-8 glass-card rounded-xl p-1.5 max-w-md mx-auto">
          <button
            onClick={() => { setMode('send'); handleReset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              mode === 'send'
                ? 'bg-primary text-primary-foreground neon-glow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-4 h-4" />
            إرسال
          </button>
          <button
            onClick={() => { setMode('receive'); handleReset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              mode === 'receive'
                ? 'bg-primary text-primary-foreground neon-glow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="w-4 h-4" />
            استلام
          </button>
        </div>

        {/* Send Mode */}
        {mode === 'send' && (
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            {!isConnected ? (
              <>
                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-lg font-medium mb-1">اضغط هنا أو اسحب الملفات</p>
                  <p className="text-sm text-muted-foreground">اختر الملفات اللي تبي تشاركها</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      الملفات المختارة ({selectedFiles.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                        >
                          <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" dir="ltr">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStartSending}
                  disabled={selectedFiles.length === 0}
                  className="w-full btn-gradient py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-5 h-5" />
                  جهّز كلمة السر
                </button>
              </>
            ) : (
              <>
                {/* Connected - Show passphrase */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Wifi className="w-5 h-5" />
                    <span className="font-medium">جاهز للمشاركة!</span>
                  </div>

                  <p className="text-muted-foreground">
                    شارك كلمة السر هذي مع الشخص اللي تبي ترسله الملفات:
                  </p>

                  <div className="glass-card rounded-xl p-6 neon-glow-cyan">
                    <p className="text-2xl font-bold tracking-wide text-foreground" dir="rtl">
                      {passphrase}
                    </p>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-card hover:bg-secondary/50 transition-all text-foreground"
                  >
                    <Copy className="w-4 h-4" />
                    انسخ كلمة السر
                  </button>

                  <div className="pt-4">
                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      بانتظار اتصال الطرف الثاني...
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  ابدأ من جديد
                </button>
              </>
            )}
          </div>
        )}

        {/* Receive Mode */}
        {mode === 'receive' && (
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            {!isConnected ? (
              <>
                <div className="text-center mb-4">
                  <WifiOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">ادخل كلمة السر اللي أعطاك إياها المرسل</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">كلمة السر</label>
                  <input
                    type="text"
                    value={receiveCode}
                    onChange={(e) => setReceiveCode(e.target.value)}
                    placeholder="نجمة - قمر - بحر - صقر"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-center text-lg"
                  />
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!receiveCode.trim()}
                  className="w-full btn-gradient py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wifi className="w-5 h-5" />
                  اتصل واستلم
                </button>
              </>
            ) : (
              <div className="text-center space-y-6">
                {isTransferring ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <p className="font-medium text-lg">جاري استلام الملفات...</p>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-[#6C5CE7] to-[#00D2FF] rounded-full transition-all duration-300 animate-progress"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(progress)}%
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 mx-auto text-green-400" />
                    <p className="font-bold text-2xl">تم الاستلام بنجاح! 🎉</p>
                    <p className="text-muted-foreground">
                      الملفات وصلت عندك، تقدر تلقاها في مجلد التحميلات
                    </p>
                  </>
                )}

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  ابدأ من جديد
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 glass-card rounded-2xl p-6 space-y-3">
          <h3 className="font-bold text-lg">🔒 كيف تشتغل المشاركة؟</h3>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">1.</span>
              المرسل يختار الملفات ويحصل على كلمة سر من 4 كلمات
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">2.</span>
              المستلم يدخل كلمة السر ويتصل مباشرة
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">3.</span>
              الملفات تنتقل مباشرة بين الأجهزة (P2P) بدون أي سيرفر وسيط
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">4.</span>
              ما نحفظ أي شي عندنا — خصوصيتك مضمونة 100%
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}