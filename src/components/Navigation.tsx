import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { logger } from '@/utils/logger';

const Navigation = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error('Błąd podczas wylogowania:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMenuOpen(false); // Zamknij menu po nawigacji
  };

  return (
    <nav className="bg-zinc-800 border-b border-zinc-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Burger button dla mobile */}
            {isMobile && (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden text-zinc-300 hover:bg-zinc-700 hover:text-white p-2"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-[280px] bg-zinc-800 border-zinc-700"
                >
                  <SheetHeader>
                    <SheetTitle className="text-zinc-100 text-left">
                      Nawigacja
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex flex-col space-y-2 mt-6">
                    <button
                      onClick={() => handleNavigate('/klienci')}
                      className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        isActive('/klienci') || location.pathname.startsWith('/klienci/')
                          ? 'bg-[#a08032] text-white'
                          : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      Klienci
                    </button>
                    
                    <button
                      onClick={() => handleNavigate('/jadlospisy')}
                      className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        isActive('/jadlospisy') || location.pathname.startsWith('/jadlospisy/')
                          ? 'bg-[#a08032] text-white'
                          : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      Jadłospisy
                    </button>
                    
                    <button
                      onClick={() => handleNavigate('/potrawy')}
                      className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        isActive('/potrawy')
                          ? 'bg-[#a08032] text-white'
                          : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      Potrawy
                    </button>
                    
                    <button
                      onClick={() => handleNavigate('/produkty')}
                      className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        isActive('/produkty')
                          ? 'bg-[#a08032] text-white'
                          : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      Produkty
                    </button>

                    {/* Separator */}
                    <div className="border-t border-zinc-600 my-4"></div>

                    {/* Wyloguj button tylko w menu mobilnym */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-3 rounded-md text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Wyloguj się</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Logo aplikacji */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.webp" 
                alt="Planer Jadłospisów" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-zinc-100">Planer Jadłospisów</h1>
            </div>
            
            {/* Przyciski nawigacyjne */}
            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => navigate('/klienci')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/klienci') || location.pathname.startsWith('/klienci/')
                    ? 'bg-[#a08032] text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                Klienci
              </button>
              
              <button
                onClick={() => navigate('/jadlospisy')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/jadlospisy') || location.pathname.startsWith('/jadlospisy/')
                    ? 'bg-[#a08032] text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                Jadłospisy
              </button>
              
              <button
                onClick={() => navigate('/potrawy')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/potrawy')
                    ? 'bg-[#a08032] text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                Potrawy
              </button>
              
              <button
                onClick={() => navigate('/produkty')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/produkty')
                    ? 'bg-[#a08032] text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                Produkty
              </button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Wyloguj się
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
