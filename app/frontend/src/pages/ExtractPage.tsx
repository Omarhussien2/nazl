import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { client } from '@/lib/api';
import {
  Scissors, Link2, Music, Video, FileText, Globe2,
  Loader2, AlertCircle, CheckCircle2, ExternalLink, Clipboard, X
} from 'lucide-react';
import { toast } from 'sonner';

type ExtractionMode = 'audio' | 'video' | 'metadata';

interface ExtractionResult {
  status: string;
  url?: string;
  filename?: string;
  picker?: Array<{
    url: string;
    thumb?: string;
    type?: string;
  }>;
}

const extractionModes: { id: ExtractionMode; label: string; icon: typeof Music; desc: string }[] = [
  { id: 'audio', label: 'استخراج الصوت', icon: Music, desc: 'حمّل الصوت بس من أي فيديو (MP3)' },
  { id: 'video', label: 'استخراج الفيديو', icon: Video, desc: 'حمّل الفيديو بدون صوت' },
  { id: 'metadata', label: 'البيانات الوصفية', icon: FileText, desc: 'اسحب معلومات الفيديو (العنوان، الوصف، التاقز)' },
];

export default function ExtractPage() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<ExtractionMode>('audio');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success('تم لصق الرابط!');
    } catch {
      toast.error('ما قدرنا نلصق، حاول يدوي');
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('حط الرابط أول!');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'metadata') {
        // For metadata, we'll show a simulated extraction
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast.success('تم استخراج البيانات الوصفية!');
        setResult({
          status: 'metadata',
          url: url,
        });
      } else {
        const response = await client.apiCall.invoke({
          url: '/api/v1/download/fetch',
          method: 'POST',
          data: {
            url: url.trim(),
            quality: '1080',
            audio_only: mode === 'audio',
          },
        });

        const data = response.data;

        if (data.success && data.data) {
          setResult(data.data);
          toast.success('جاهز! اضغط على رابط التحميل');
        } else {
          setError(data.error || 'صار خطأ، حاول مرة ثانية');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'صار خطأ غير متوقع';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openDownloadLink = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="bg-gradient-to-l from-[#FF6B6B] to-[#6C5CE7] bg-clip-text text-transparent">
              استخرج الأصول
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            افصل الصوت عن الفيديو، اسحب الترجمات والبيانات الوصفية بضغطة زر
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {extractionModes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(''); }}
                className={`glass-card rounded-xl p-4 text-right transition-all ${
                  mode === m.id
                    ? 'neon-glow border-primary/50'
                    : 'hover:border-primary/30'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`font-bold text-sm ${mode === m.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {m.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* URL Input & Extract */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              رابط الفيديو
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  dir="ltr"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-left"
                />
                {url && (
                  <button
                    onClick={() => { setUrl(''); setResult(null); setError(''); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handlePaste}
                className="px-4 py-3.5 rounded-xl glass-card hover:bg-secondary/50 transition-all text-muted-foreground hover:text-foreground"
                title="لصق من الحافظة"
              >
                <Clipboard className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            onClick={handleExtract}
            disabled={loading || !url.trim()}
            className="w-full btn-gradient py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الاستخراج...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                استخرج الآن!
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">
                  {result.status === 'metadata' ? 'تم استخراج البيانات!' : 'جاهز للتحميل!'}
                </span>
              </div>

              {result.status === 'metadata' ? (
                <div className="space-y-3 p-4 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe2 className="w-4 h-4 text-primary" />
                    <span className="font-medium">الرابط:</span>
                    <span className="text-muted-foreground truncate" dir="ltr">{result.url}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ملاحظة: استخراج البيانات الوصفية الكامل (العنوان، الوصف، التاقز، عدد المشاهدات) يحتاج معالجة متقدمة على السيرفر.
                    هذي نسخة تجريبية.
                  </p>
                </div>
              ) : (
                <>
                  {result.url && (
                    <button
                      onClick={() => openDownloadLink(result.url!)}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span className="font-medium">
                        {mode === 'audio' ? 'حمّل الصوت' : 'حمّل الفيديو'}
                      </span>
                    </button>
                  )}

                  {result.picker && result.picker.length > 0 && (
                    <div className="space-y-2">
                      {result.picker.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => openDownloadLink(item.url)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl glass-card hover:neon-glow transition-all text-right"
                        >
                          {item.thumb && (
                            <img src={item.thumb} alt="" className="w-16 h-12 rounded-lg object-cover" />
                          )}
                          <span className="flex-1 text-sm font-medium">ملف #{i + 1}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Use Cases */}
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5 space-y-2">
            <h3 className="font-bold flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              لصناع المحتوى
            </h3>
            <p className="text-sm text-muted-foreground">
              استخرج الصوت من أي فيديو لاستخدامه في البودكاست أو الريلز
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-2">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              للمحللين
            </h3>
            <p className="text-sm text-muted-foreground">
              اسحب البيانات الوصفية للمنافسين لاكتشاف فجوات المحتوى
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}