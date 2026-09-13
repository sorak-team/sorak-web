import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Ensure theme is in sync if user navigates directly to /404 while logged in
  useEffect(() => {
    try {
      const auth = localStorage.getItem('sorak-auth');
      const user = auth ? JSON.parse(auth).state?.user : null;
      if (!user) {
        document.documentElement.classList.remove('dark');
        return;
      }
      const savedTheme = localStorage.getItem('sorak-theme') || 'light';
      const isDark =
        savedTheme === 'dark' ||
        (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] min-h-screen w-screen bg-background flex flex-col p-6 sm:p-10 select-none overflow-y-auto"
      data-node-id="4124:2051"
      data-name="404 · Default"
    >
      {/* Top Header with Sorak Brand */}
      <div className="w-full flex items-center shrink-0" data-node-id="4126:2018">
        <Link
          to="/"
          className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity"
          data-node-id="4126:2019"
        >
          <img
            src="/logo.svg"
            alt="Sorak Logo"
            className="h-6 sm:h-7 w-auto block shrink-0"
            data-node-id="4126:2022"
          />
          <span
            className="font-bold text-lg sm:text-xl text-foreground tracking-tight"
            data-node-id="4126:2024"
          >
            Sorak
          </span>
        </Link>
      </div>

      {/* Centered 404 Main Content */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto -mt-6 sm:-mt-10 px-4 py-8"
        data-node-id="4126:2025"
      >
        {/* Figma 404 Illustration (Hot air balloon 404) */}
        <div
          className="relative w-full max-w-[480px] sm:max-w-[540px] aspect-[591/420] flex items-center justify-center mb-6"
          data-node-id="4126:2026"
        >
          <img
            src="/404-illustration.svg"
            alt="404 Not Found Illustration"
            className="w-full h-full object-contain pointer-events-none block dark:hidden"
          />
          <img
            src="/404-illustration-dark.svg"
            alt="404 Not Found Illustration"
            className="w-full h-full object-contain pointer-events-none hidden dark:block"
          />
        </div>

        {/* 404 Copy */}
        <div className="space-y-2 mb-6" data-node-id="4126:2088">
          <h1
            className="text-2xl font-medium text-foreground tracking-tight"
            data-node-id="4126:2089"
          >
            {t('notFound.title')}
          </h1>
          <p
            className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed"
            data-node-id="4126:2090"
          >
            {t('notFound.description')}
          </p>
        </div>

        {/* Actions matching Figma wireframe */}
        <div
          className="flex flex-row items-center justify-center gap-3 w-full"
          data-node-id="4126:2091"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="w-[150px] h-9 text-sm font-medium border-border text-foreground hover:bg-muted/50 rounded-none shadow-none transition-all active:scale-[0.99] cursor-pointer"
            data-node-id="4126:2092"
          >
            {t('notFound.back')}
          </Button>

          <Button
            asChild
            className="w-[150px] h-9 text-sm font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none transition-all active:scale-[0.99] cursor-pointer"
            data-node-id="4126:2102"
          >
            <Link to="/">{t('notFound.home')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
