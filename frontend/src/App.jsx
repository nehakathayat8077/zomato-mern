import './App.css'
import './styles/theme.css'
import AppRoutes from './Routes/AppRoutes'

const savedTheme = localStorage.getItem('zomato-theme')
const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme
  : 'system'

document.documentElement.dataset.theme = initialTheme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : initialTheme

function App() {
 

  return (
    <>
      <AppRoutes/>
    </>
  )
}

export default App
