import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/launch/launch.page').then((m) => m.LaunchPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
  loadComponent: () =>
    import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup-step1',
    loadComponent: () =>
      import('./pages/signup-step1/signup-step1.page').then((m) => m.SignupStep1Page),
  },  
  {
    path: 'signup-step2',
    loadComponent: () =>
      import('./pages/signup-step2/signup-step2.page').then((m) => m.SignupStep2Page),
  },   {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then( m => m.ProfilePage)
  },
  {
    path: 'upload-notes',
    loadComponent: () => import('./pages/upload-notes/upload-notes.page').then( m => m.UploadNotesPage)
  },
  {
    path: 'my-notes',
    loadComponent: () => import('./pages/my-notes/my-notes.page').then( m => m.MyNotesPage)
  },
  {
    path: 'notes-feed',
    loadComponent: () => import('./pages/notes-feed/notes-feed.page').then( m => m.NotesFeedPage)
  },
  {
    path: 'favorite-notes',
    loadComponent: () => import('./pages/favorite-notes/favorite-notes.page').then( m => m.FavoriteNotesPage)
  },
  {
    path: 'profile-settings',
    loadComponent: () => import('./pages/profile-settings/profile-settings.page').then( m => m.ProfileSettingsPage)
  },
  {
    path: 'verify-info',
    loadComponent: () => import('./pages/verify-info/verify-info.page').then( m => m.VerifyInfoPage)
  },
  {
    path: 'email-verified',
    loadComponent: () => import('./pages/email-verified/email-verified.page').then( m => m.EmailVerifiedPage)
  },
  {
    path: 'verify-invalid',
    loadComponent: () => import('./pages/verify-invalid/verify-invalid.page').then( m => m.VerifyInvalidPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then( m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'edit-note/:id',
    loadComponent: () =>
      import('./pages/edit-note/edit-note.page').then(m => m.EditNotePage)
  },   {
    path: 'search-users',
    loadComponent: () => import('./pages/search-users/search-users.page').then( m => m.SearchUsersPage)
  },
  {
    path: 'user/:id',
    loadComponent: () => import('./pages/user-profile/user-profile.page').then( m => m.UserProfilePage)
  },
  {
    path: 'edit-needs-help',
    loadComponent: () => import('./pages/edit-needs-help/edit-needs-help.page').then( m => m.EditNeedsHelpPage)
  }
  
  
 
 
];

