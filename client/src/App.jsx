import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { setCredentials, setLoading, selectIsLoading } from './features/auth/authSlice';
import { useRefreshTokenMutation } from './features/auth/authApi';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AppRoutes from './routes/AppRoutes';
import { FullscreenSpinner } from './components/ui/LoadingSpinner';
import useSocket from './hooks/useSocket';

function SocketInitializer() {
  useSocket();
  return null;
}

export default function App() {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectIsLoading);
  const [refreshToken] = useRefreshTokenMutation();

  useEffect(() => {
    const init = async () => {
      try {
        const result = await refreshToken().unwrap();
        if (result?.accessToken && result?.user) {
          dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }));
        } else {
          dispatch(setLoading(false));
        }
      } catch {
        dispatch(setLoading(false));
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <FullscreenSpinner />;

  return (
    <>
      <SocketInitializer />
      <div className="flex flex-col min-h-screen bg-[#F1F1F6]">
        <Navbar />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1C1C1C',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#60B246', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#E23744', secondary: '#fff' },
          },
        }}
      />
    </>
  );
}
