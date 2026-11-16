import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { DashboardScreen } from '@/features/dashboard'
import { ForgotPasswordScreen, SignInScreen, SignUpScreen } from '@/features/auth'
import { NoteDetailScreen, NoteFormScreen, NotesListScreen } from '@/features/notes'
import { OnboardingScreen } from '@/features/onboarding'
import { ProfileScreen } from '@/features/profile'
import { SettingsScreen } from '@/features/settings'
import NotFound from './NotFound.vue'
import SignedIn from './SignedIn.vue'

export const routes = [
  // Public auth screens (they send signed-in users home themselves).
  { path: '/sign-in', component: SignInScreen },
  { path: '/sign-up', component: SignUpScreen },
  { path: '/forgot-password', component: ForgotPasswordScreen },
  {
    path: '/',
    component: SignedIn,
    children: [
      { path: 'welcome', component: OnboardingScreen },
      { path: '', component: DashboardScreen },
      { path: 'notes', component: NotesListScreen },
      { path: 'notes/new', component: NoteFormScreen },
      { path: 'notes/:id', component: NoteDetailScreen },
      { path: 'settings', component: SettingsScreen },
      { path: 'profile', component: ProfileScreen },
      { path: ':pathMatch(.*)*', component: NotFound },
    ],
  },
]

export const makeRouter = (history: RouterHistory = createWebHistory()) => createRouter({ history, routes })
