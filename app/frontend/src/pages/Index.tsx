import { Link } from 'react-router-dom';
import {
  Download,
  Scissors,
  Zap,
  Globe,
  Shield,
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Archive,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

const supportedSites = [
  'YouTube', 'TikTok', 'Instagram', 'Twitter/X', 'Facebook',
  'Reddit', 'Twitch', 'SoundCloud', 'Bilibili', 'Vimeo',
  'Dailymotion', 'Pinterest', 'Tumblr', 'Threads', 'Snapchat',
  'Loom', 'Streamable', '+1800 موقع آخر',
];

const features = [
  {
    icon: Mic,
    title: 'فرّغ',
    desc: 'تفريغ صوتي عربي بالطوابع الزمنية عبر Whisper. أرسل الرابط واحصل على النص الكامل خلال دقائق.',
  },
  {
    icon: Download,
    title: 'نزّل',
    desc: 'حمّل الفيديو أو الصوت من 1800+ منصّة بجودات متعدّدة (MP3/MP4/حتى 4K) بضغطة واحدة.',
  },
  {
    icon: ImageIcon,
    title: 'صوّر',
    desc: 'استخرج صور إنستغرام وتويتر وبنترست من أيّ رابط — حتى الـ carousels كاملة.',
  },
  {
    icon: Archive,
    title: 'أرشف',
    desc: 'احفظ كل ما نزّلته في مكتبتك الخاصة، مع بحث نصّي داخل النصوص المُفرَّغة.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section — antimetal-style dark gradient */}
      <section className="relative pt-24 pb-28 overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1E4AAA]/30 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F14B] animate-pulse" />
            جديد — دعم الصور والـ carousels
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
            أي رابط، من أي منصّة.
            <br />
            <span className="text-[#D4F14B]">فيديو أو صوت أو صورة</span> في ثوانٍ.
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            الصق الرابط من يوتيوب، تيك توك، إنستغرام، تويتر، بنترست أو 1800 منصّة أخرى —
            ونزل يتولّى التحميل والتفريغ العربي والأرشفة. مجاني، بدون إعلانات، مفتوح المصدر.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/download"
              className="btn-lime px-8 py-4 rounded-xl text-lg inline-flex items-center justify-center gap-2 group"
            >
              <Download className="w-5 h-5" />
              ابدأ مجاناً
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/extract"
              className="px-8 py-4 rounded-xl font-bold text-lg bg-white/10 text-white hover:bg-white/15 border border-white/15 transition-all inline-flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              جرّب التفريغ
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6 justify-center text-sm text-white/60 pt-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4F14B]" />
              مجاني بالكامل
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D4F14B]" />
              بدون إعلانات
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#D4F14B]" />
              مفتوح المصدر
            </div>
          </div>
        </div>
      </section>

      {/* Features — 4 cards */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              الصق الرابط، و<span className="text-[#D4F14B]">نزل</span> يتولّى الباقي
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              أربع أدوات في منصة واحدة — تفريغ، تحميل، استخراج صور، وأرشفة.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#D4F14B]/15 border border-[#D4F14B]/30 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-[#D4F14B]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported sites */}
      <section className="py-20 relative bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              ندعم <span className="text-[#D4F14B]">+1800</span> منصّة
            </h2>
            <p className="text-muted-foreground text-lg">
              الأرقام من قائمة yt-dlp الرسميّة — هذي بعض الأشهر.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {supportedSites.map((site, i) => (
              <span
                key={i}
                className="glass-card px-4 py-2 rounded-full text-sm font-medium text-foreground/90 hover:text-[#D4F14B] hover:border-[#D4F14B]/40 transition-all cursor-default"
              >
                {site}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — dark band before footer */}
      <section className="py-20 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            جاهز تبدأ؟
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
            الصق الرابط، ونزل يتولّى الباقي. مجاني، سريع، وبدون تسجيل لأول تفريغة.
          </p>
          <Link
            to="/download"
            className="btn-lime px-10 py-4 rounded-xl text-lg inline-flex items-center gap-2 group"
          >
            <Scissors className="w-5 h-5" />
            جرّب الآن
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-xs text-white/50">
            10 تفريغات/يوم &nbsp;·&nbsp; حلقة حتى 60 دقيقة &nbsp;·&nbsp; تحميلات غير محدودة
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-muted-foreground text-sm">
            نزل © {new Date().getFullYear()} — مفتوح المصدر ومجاني للجميع
          </p>
        </div>
      </footer>
    </div>
  );
}
