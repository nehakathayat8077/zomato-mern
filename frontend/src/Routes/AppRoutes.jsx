import { BrowserRouter as Router , Routes, Route } from 'react-router-dom'
import UserLogin from '../pages/UserLogin'
import UserRegister from '../pages/UserRegister'
import FoodPartnerLogin from '../pages/FoodPartnerLogin'
import FoodPartnerRegister from '../pages/FoodPartnerRegister'
import Home from '../general/Home'
import FoodPartnerProfile from '../food-partner/profile'
import CreateFood from '../pages/CreateFood'
import UserProfile from '../pages/UserProfile'


const AppRoutes = () => {
  return (
    <div>
      <Router>
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/user/register' element={<UserRegister />} />
          <Route path='/user/login' element={<UserLogin />} />
          <Route path='/food-partner/login' element={<FoodPartnerLogin />} />
          <Route path='/food-partner/register' element={<FoodPartnerRegister />} />
          <Route path='/food-partner/create' element={<CreateFood />} />
          <Route path='/food-partner/:id' element={<FoodPartnerProfile />} />
          <Route path='/profile' element={<UserProfile />} />
        </Routes>
      </Router>
    </div>
  )
}

export default AppRoutes
