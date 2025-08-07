import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './global.css'

// Import pages
import Index from './pages/Index.vue'
import NotFound from './pages/NotFound.vue'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Index },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

// Create and mount app
const app = createApp(App)
app.use(router)
app.mount('#app')
