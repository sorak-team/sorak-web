import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export function LanguageSwitcher({ className }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 bg-white/95 backdrop-blur-sm border border-border/80 rounded-md shadow-sm select-none',
        className,
      )}
      data-node-id="language-switcher"
    >
      <Globe className="size-3.5 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => i18n.changeLanguage('vi')}
          className={cn(
            'transition-colors cursor-pointer py-0.5',
            currentLang === 'vi'
              ? 'font-bold text-foreground'
              : 'font-medium text-muted-foreground hover:text-foreground',
          )}
          aria-label="Tiếng Việt"
        >
          VI
        </button>
        <span className="text-border/80 select-none text-[10px]">|</span>
        <button
          type="button"
          onClick={() => i18n.changeLanguage('en')}
          className={cn(
            'transition-colors cursor-pointer py-0.5',
            currentLang === 'en'
              ? 'font-bold text-foreground'
              : 'font-medium text-muted-foreground hover:text-foreground',
          )}
          aria-label="English"
        >
          EN
        </button>
      </div>
    </div>
  );
}

export default LanguageSwitcher;
