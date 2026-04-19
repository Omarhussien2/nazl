import { Link } from 'react-router-dom';
import { Download, Share2, Scissors, Zap, Globe, Shield, ArrowLeft, Play } from 'lucide-react';
import Navbar from '@/components/Navbar';

const HERO_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1133212/2026-04-19/m42nuuaaafaa/hero-download-neon.png';
const SPEED_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1133212/2026-04-19/m42nnxyaae7a/feature-speed.png';
const SHARE_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1133212/2026-04-19/m42nosqaae7q/feature-share.png';
const EXTRACT_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1133212/2026-04-19/m42nndaaafbq/feature-extract.png';

const supportedSites = [
  'YouTube', 'TikTok', 'Instagram', 'Twitter/X', 'Facebook',
  'Reddit', 'Twitch', 'SoundCloud', 'Bilibili', 'Vimeo',
  'Dailymotion', 'Pinterest', 'Tumblr', 'VK', 'OK.ru',
  'Rutube', 'Loom', 'Streamable', 'Vine', '+1000 موقع ثاني',
];

const features = [
  {
    icon: Zap,
    title: 'سرعة خارقة',
    desc: 'حمّل فيديوهاتك بأعلى سرعة ممكنة بدون أي تأخير أو انتظار',
    img: SPEED_IMG,
    color: 'from-purple-500 to-blue-500',
  },
  {
    icon: Share2,
    title: 'مشاركة سحرية P2P',
    desc: 'شارك ملفاتك مع أي شخص بكلمة سر من 4 كلمات بس، بدون رفع على أي سحابة',
    img: SHARE_IMG,
    color: 'from-cyan-500 to-green-500',
  },
  {
    icon: Scissors,
    title: 'استخراج الأصول',
    desc: 'افصل الصوت عن الفيديو، اسحب الترجمات والبيانات الوصفية بضغطة زر',
    img: EXTRACT_IMG,
    color: 'from-pink-500 to-orange-500',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-right space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-primary">
                <Globe className="w-4 h-4" />
                <span>يدعم أكثر من 1000 موقع</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-l from-[#6C5CE7] to-[#00D2FF] bg-clip-text text-transparent neon-text">
                  نزّل
                </span>
                <br />
                <span className="text-foreground">أي فيديو بضغطة زر</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 lg:mr-0">
                انسخ الرابط، اضغط تحميل، وانتهى الأمر! منصة مجانية 100% لتحميل الفيديوهات
                ومشاركة الملفات بتقنية P2P بدون أي تعقيد.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/download"
                  className="btn-gradient px-8 py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 group"
                >
                  <Download className="w-5 h-5" />
                  يلا نزّل!
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/share"
                  className="px-8 py-4 rounded-xl font-bold text-lg glass-card text-foreground hover:bg-secondary/50 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  شارك ملفاتك
                </Link>
              </div>

              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  مجاني 100%
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  بدون إعلانات
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  مفتوح المصدر
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl" />
              <img
                src={HERO_IMG}
                alt="نزّل - منصة التحميل"
                className="relative rounded-2xl neon-glow w-full object-cover"
              />
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 glass-card rounded-xl px-4 py-3 flex items-center gap-2 neon-glow animate-pulse-glow">
                <Play className="w-5 h-5 text-green-400" />
                <span className="text-sm font-bold">+1000 موقع مدعوم</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              ليش{' '}
              <span className="bg-gradient-to-l from-[#6C5CE7] to-[#00D2FF] bg-clip-text text-transparent">
                نزّل
              </span>
              ؟
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              مو بس أداة تحميل، هذي منصة متكاملة تخليك تحمّل وتشارك وتستخرج كل شي تبيه
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-6 hover:neon-glow transition-all duration-300 group cursor-default"
                >
                  <div className="relative h-48 rounded-xl overflow-hidden mb-6">
                    <img
                      src={feature.img}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${feature.color} opacity-20`} />
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Sites */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">المواقع المدعومة</h2>
            <p className="text-muted-foreground text-lg">
              ندعم أكثر من 1000 موقع، هذي بس أشهرها
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {supportedSites.map((site, i) => (
              <span
                key={i}
                className="glass-card px-4 py-2 rounded-full text-sm font-medium text-foreground hover:neon-glow hover:text-primary transition-all cursor-default"
              >
                {site}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="glass-card rounded-3xl p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-[#6C5CE7] to-[#00D2FF]" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              جاهز تبدأ؟
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              حط الرابط وخلنا نسوي الباقي. مجاني، سريع، وبدون أي تعقيد.
            </p>
            <Link
              to="/download"
              className="btn-gradient px-10 py-4 rounded-xl text-white font-bold text-lg inline-flex items-center gap-2 group"
            >
              <Download className="w-5 h-5" />
              يلا نبدأ!
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-muted-foreground text-sm">
            صُنع بـ 💜 — نزّل © {new Date().getFullYear()} — مفتوح المصدر ومجاني للجميع
          </p>
        </div>
      </footer>
    </div>
  );
}