import { Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Sorak Web Portal</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Hệ thống theo dõi sức khỏe và phát triển trẻ mầm non
        </p>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <p className="text-muted-foreground">Không tìm thấy trang</p>
          </div>
        }
      />
    </Routes>
  );
}