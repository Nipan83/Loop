import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import CategoryBar from './components/CategoryBar'
import Home from './pages/Home'
import Category from './pages/Category'
import PostDetail from './pages/PostDetail'
import CreatePost from './pages/CreatePost'
import Bookmarks from './pages/Bookmarks'
import Login from './pages/Login'
import Signup from './pages/Signup'

function App() {
  const { categories, categoriesLoaded } = useAuth()
  const location = useLocation()
  
  // Pages that should show the category bar
  const showCategoryBar = ['/', '/category'].some(path => 
    location.pathname === path || location.pathname.startsWith('/category/')
  )

  return (
    <div className="app">
      <Navbar />
      {showCategoryBar && categoriesLoaded && (
        <div className="category-bar-wrapper">
          <div className="category-bar-container">
            <CategoryBar categories={categories} />
          </div>
        </div>
      )}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
    </div>
  )
}

export default App