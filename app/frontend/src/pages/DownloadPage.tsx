import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { client } from '@/lib/api';
import {
  Download, Link2, Loader2, AlertCircle, CheckCircle2,
  Music, Video, FileText, ExternalLink, Clipboard, X
} from 'lucide-react';
import { toast } from 'sonner';

interface DownloadResult {
  status: string;
  url?: string;
  filename?: string;
  picker?: Array<{
    url: string;
    thumb?: string;
    type?: string;
  }>;
}

const qualityOptions = [
  { value: '2160', label: '4K (2160p)' },
  { value: '1440', label: '2K (1440p)' },
  { value: '1080', label: 'Full HD (1080p)' },
  { value: '720', label: 'HD (720p)' },
  { value: '480', label: 'SD (480p)' },
  { value: '360', label: '360p' },
];

export default function DownloadPage() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('1080');
  const [audioOnly, setAudioOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
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

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('حط الرابط أول!');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/download/fetch',
        method: 'POST',
        data: {
          url: url.trim(),
          quality,
          audio_only: audioOnly,
        },
      });

      const data = response.data;

      if (data.success && data.data) {
        setResult(data.data);
        toast.success('جاهز! اضغط على رابط التحميل');
      } else {
        setError(data.error || 'صار خطأ، حاول مرة ثانية');
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
            <span className="bg-gradient-to-l from-[#6C5CE7] to-[#00D2FF] bg-clip-text text-transparent">
              حمّل أي فيديو
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            حط الرابط واختر الجودة وخلنا نسوي الباقي
          </p>
        </div>

        {/* URL Input */}
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

          {/* Options */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">الجودة</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                disabled={audioOnly}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                {qualityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">النوع</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAudioOnly(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    !audioOnly
                      ? 'border-primary bg-primary/10 text-primary neon-glow'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  فيديو
                </button>
                <button
                  onClick={() => setAudioOnly(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    audioOnly
                      ? 'border-primary bg-primary/10 text-primary neon-glow'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  صوت بس
                </button>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="w-full btn-gradient py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                يلا نزّل!
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
                <span className="font-medium">جاهز للتحميل!</span>
              </div>

              {/* Direct download link */}
              {result.url && (
                <button
                  onClick={() => openDownloadLink(result.url!)}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all group"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span className="font-medium">اضغط هنا للتحميل</span>
                  {result.filename && (
                    <span className="text-xs text-green-400/60 truncate max-w-[200px]" dir="ltr">
                      {result.filename}
                    </span>
                  )}
                </button>
              )}

              {/* Picker (multiple options) */}
              {result.picker && result.picker.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">اختر اللي تبيه:</p>
                  <div className="grid gap-2">
                    {result.picker.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => openDownloadLink(item.url)}
                        className="flex items-center gap-3 p-3 rounded-xl glass-card hover:neon-glow transition-all text-right"
                      >
                        {item.thumb && (
                          <img
                            src={item.thumb}
                            alt=""
                            className="w-16 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {item.type === 'video' ? (
                              <Video className="w-4 h-4 text-primary" />
                            ) : (
                              <FileText className="w-4 h-4 text-accent" />
                            )}
                            <span className="text-sm font-medium">
                              {item.type === 'video' ? 'فيديو' : 'ملف'} #{i + 1}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 glass-card rounded-2xl p-6 space-y-3">
          <h3 className="font-bold text-lg">💡 نصائح</h3>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              انسخ رابط الفيديو من المتصفح أو التطبيق والصقه هنا
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              اختر "صوت بس" إذا تبي تحمّل الصوت فقط (MP3)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              بعض المواقع ما تدعم كل الجودات، النظام يختار أقرب جودة متوفرة
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              إذا ما اشتغل الرابط، تأكد إنه رابط صحيح وكامل
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}