import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { client } from '@/lib/api';
import {
  Scissors, Link2, Music, Video, FileText, Globe2,
  Loader2, AlertCircle, CheckCircle2, ExternalLink, Clipboard, X,
  Copy, Check, Subtitles, Eye, User, Clock
} from 'lucide-react';
import { toast } from 'sonner';

type ExtractionMode = 'audio' | 'video' | 'metadata' | 'transcribe';

interface PickerItem {
  url: string;
  thumb?: string;
  type?: string;
  resolution?: string;
  ext?: string;
  filesize?: number | null;
  tbr?: number | null;
}

interface ExtractionResult {
  status?: string;
  url?: string;
  filename?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  view_count?: number;
  like_count?: number;
  description?: string;
  extractor?: string;
  webpage_url?: string;
  audio_only?: boolean;
  picker?: PickerItem[];
}

interface TranscriptionResult {
  text: string;
}

const extractionModes: { id: ExtractionMode; label: string; icon: typeof Music; desc: string }[] = [
  { id: 'audio', label: 'استخراج الصوت', icon: Music, desc: 'حمّل الصوت بس من أي فيديو (MP3)' },
  { id: 'video', label: 'استخراج الفيديو', icon: Video, desc: 'حمّل الفيديو بدون صوت' },
  { id: 'transcribe', label: 'تفريغ نصي', icon: Subtitles, desc: 'حوّل الصوت لنص مكتوب تلقائياً' },
  { id: 'metadata', label: 'البيانات الوصفية', icon: FileText, desc: 'اسحب معلومات الفيديو (العنوان، الوصف، التاقز)' },
];

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(num: number | undefined): string {
  if (!num) return '';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function ExtractPage() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<ExtractionMode>('audio');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success('تم لصق الرابط!');
    } catch {
      toast.error('ما قدرنا نلصق، حاول يدوي');
    }
  };

  const handleCopyText = async () => {
    if (!transcriptionText) return;
    try {
      await navigator.clipboard.writeText(transcriptionText);
      setCopied(true);
      toast.success('تم نسخ النص!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('ما قدرنا ننسخ');
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
    setTranscriptionText('');

    try {
      if (mode === 'metadata') {
        // Use yt-dlp to fetch video info
        const response = await client.apiCall.invoke({
          url: '/api/v1/download/fetch',
          method: 'POST',
          data: {
            url: url.trim(),
            quality: '720',
            audio_only: false,
          },
          options: {
            timeout: 120_000,
          },
        });

        const data = response.data;

        if (data.success && data.data) {
          setResult({ ...data.data, status: 'metadata' });
          toast.success('تم استخراج البيانات الوصفية!');
        } else {
          setError(data.error || 'صار خطأ، حاول مرة ثانية');
        }
      } else if (mode === 'transcribe') {
        const response = await client.apiCall.invoke({
          url: '/api/v1/download/transcribe',
          method: 'POST',
          data: {
            url: url.trim(),
          },
          options: {
            timeout: 300_000,
          },
        });

        const data = response.data;

        if (data.success && data.text) {
          setTranscriptionText(data.text);
          toast.success('تم التفريغ النصي بنجاح!');
        } else {
          setError(data.error || 'صار خطأ أثناء التفريغ، حاول مرة ثانية');
        }
      } else {
        const response = await client.apiCall.invoke({
          url: '/api/v1/download/fetch',
          method: 'POST',
          data: {
            url: url.trim(),
            quality: '1080',
            audio_only: mode === 'audio',
          },
          options: {
            timeout: 120_000,
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
            <span className="text-[#D4F14B]">
              استخرج الأصول
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            افصل الصوت عن الفيديو، سوّي تفريغ نصي، واسحب البيانات الوصفية بضغطة زر
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {extractionModes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(''); setTranscriptionText(''); }}
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
              {mode === 'transcribe' ? 'رابط الفيديو أو الصوت' : 'رابط الفيديو'}
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
                    onClick={() => { setUrl(''); setResult(null); setError(''); setTranscriptionText(''); }}
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
            className="w-full btn-gradient py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {mode === 'transcribe' ? 'جاري التفريغ النصي...' : 'جاري الاستخراج...'}
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                {mode === 'transcribe' ? 'فرّغ النص!' : 'استخرج الآن!'}
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

          {/* Transcription Result */}
          {mode === 'transcribe' && transcriptionText && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">تم التفريغ النصي!</span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm hover:bg-secondary/50 transition-all text-foreground"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'تم النسخ!' : 'انسخ النص'}
                </button>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={transcriptionText}
                  onChange={(e) => setTranscriptionText(e.target.value)}
                  className="w-full h-64 bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                  dir="auto"
                />
                <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
                  {transcriptionText.length} حرف
                </div>
              </div>
            </div>
          )}

          {/* Metadata Result */}
          {result && mode === 'metadata' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">تم استخراج البيانات!</span>
              </div>

              {/* Thumbnail + Title */}
              <div className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt={result.title || ''}
                    className="w-40 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-bold text-sm line-clamp-2">{result.title || 'بدون عنوان'}</p>
                  {result.uploader && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      {result.uploader}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {result.duration && (
                  <div className="p-3 rounded-xl bg-secondary/30 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">المدة</p>
                    <p className="text-sm font-bold">{formatDuration(result.duration)}</p>
                  </div>
                )}
                {result.view_count !== undefined && (
                  <div className="p-3 rounded-xl bg-secondary/30 text-center">
                    <Eye className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">مشاهدات</p>
                    <p className="text-sm font-bold">{formatNumber(result.view_count)}</p>
                  </div>
                )}
                {result.like_count !== undefined && (
                  <div className="p-3 rounded-xl bg-secondary/30 text-center">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">إعجابات</p>
                    <p className="text-sm font-bold">{formatNumber(result.like_count)}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {result.description && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">الوصف:</p>
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border max-h-40 overflow-y-auto">
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed" dir="auto">
                      {result.description.slice(0, 1000)}
                      {result.description.length > 1000 ? '...' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Source info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe2 className="w-3.5 h-3.5" />
                <span>المصدر: {result.extractor || 'غير معروف'}</span>
                {result.webpage_url && (
                  <a
                    href={result.webpage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mr-2"
                    dir="ltr"
                  >
                    الرابط الأصلي
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Download Result (audio/video modes) */}
          {result && mode !== 'transcribe' && mode !== 'metadata' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">جاهز للتحميل!</span>
              </div>

              {/* Video info */}
              {result.title && (
                <div className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                  {result.thumbnail && (
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-32 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm line-clamp-2">{result.title}</p>
                    {result.uploader && (
                      <p className="text-xs text-muted-foreground">{result.uploader}</p>
                    )}
                  </div>
                </div>
              )}

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
                  <p className="text-sm text-muted-foreground">اختر الجودة:</p>
                  {result.picker.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => openDownloadLink(item.url)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl glass-card hover:neon-glow transition-all text-right"
                    >
                      {item.type === 'video' ? (
                        <Video className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Music className="w-5 h-5 text-accent flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {item.resolution || `${item.type === 'video' ? 'فيديو' : 'صوت'} #${i + 1}`}
                          </span>
                          {item.ext && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                              {item.ext}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Use Cases */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
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
              <Subtitles className="w-5 h-5 text-green-400" />
              للتفريغ النصي
            </h3>
            <p className="text-sm text-muted-foreground">
              حوّل أي فيديو أو صوت لنص مكتوب تلقائياً بالذكاء الاصطناعي
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