import AppRouter from './routes/AppRouter';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
