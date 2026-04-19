# نزّل - منصة التحميل والمشاركة (Saudi Arabic Downloader & P2P Hub)

## Design Guidelines

### Design References
- **Savefrom.net**: Clean download interface
- **Y2mate**: Simple paste-and-download flow
- **Style**: Cyberpunk Neon + Dark Mode + RTL Arabic

### Color Palette
- Primary Background: #0A0A1A (Deep Space Blue)
- Secondary Background: #12122A (Card Dark)
- Accent Primary: #6C5CE7 (Neon Purple)
- Accent Secondary: #00D2FF (Cyan Glow)
- Accent Tertiary: #FF6B6B (Coral Red for CTAs)
- Success: #00E676 (Neon Green)
- Text Primary: #FFFFFF
- Text Secondary: #A0A0C0 (Muted Lavender)
- Border/Glow: #6C5CE7/20 (Purple with opacity)

### Typography
- Font: IBM Plex Sans Arabic (Google Fonts)
- Heading1: 700 weight, 48px
- Heading2: 600 weight, 36px
- Body: 400 weight, 16px
- Button: 700 weight, 18px

### Key Component Styles
- Buttons: Gradient purple-to-cyan, white text, 12px rounded, glow shadow on hover
- Cards: Dark glass morphism (#12122A/80), backdrop-blur, 1px border purple glow
- Inputs: Dark background, purple border on focus, large padding for Arabic text
- All text: RTL direction

### Images to Generate
1. **hero-download-neon.jpg** - Abstract neon download arrows and data streams on dark background, cyberpunk style (1024x576)
2. **feature-speed.jpg** - Abstract speed/lightning bolt visualization, neon purple and cyan colors (512x512)
3. **feature-share.jpg** - Abstract P2P network nodes connected with glowing lines (512x512)
4. **feature-extract.jpg** - Abstract audio waveform and video frames being separated, neon style (512x512)

---

## Development Tasks

### Files to Create (8 files max)

1. **src/pages/Index.tsx** - Landing page (hero + features + supported sites + CTA)
2. **src/pages/DownloadPage.tsx** - Main download page (paste URL, fetch info, select quality, download)
3. **src/pages/SharePage.tsx** - P2P file sharing page (generate code, connect, transfer)
4. **src/pages/ExtractPage.tsx** - Asset extraction page (audio/video/subtitles/metadata)
5. **src/components/Navbar.tsx** - Navigation bar with dark/light toggle + RTL
6. **src/components/ThemeProvider.tsx** - Dark/Light mode context provider
7. **src/App.tsx** - Router setup with all pages
8. **src/index.css** - Custom theme variables, RTL support, animations, Arabic font

### Backend
- **backend/routers/download.py** - API endpoint that calls cobalt.tools API to fetch video info and download links
- **backend/services/download_service.py** - Service logic for cobalt API integration

### All UI Text in Saudi Arabic (عامية):
- "نزّل" (Download/App name)
- "حط الرابط هنا" (Paste the link here)
- "يلا نزّل!" (Let's download!)
- "شارك ملفاتك" (Share your files)
- "استخرج الأصول" (Extract assets)
- "المواقع المدعومة" (Supported sites)
- "الصفحة الرئيسية" (Home)
- "تحميل" (Download)
- "مشاركة" (Share)
- "استخراج" (Extract)