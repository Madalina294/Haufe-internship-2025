import { Routes } from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {WelcomeComponent} from './pages/welcome/welcome.component';
import {authGuard} from './auth/guard/auth.guard';
import {ProfileComponent} from './pages/profile/profile.component';
import {UpdatePasswordComponent} from './pages/update-password/update-password.component';
import {ResetPasswordComponent} from './pages/reset-password/reset-password.component';
import {EnterEmailComponent} from './pages/enter-email/enter-email.component';
import {OAuthCallbackComponent} from './auth/oauth-callback/oauth-callback.component';
import {EditPreferencesComponent} from './pages/edit-preferences/edit-preferences.component';
import {ProjectDetailComponent} from './codezen/project-detail/project-detail.component';
import {ReviewDetailComponent} from './codezen/review-detail/review-detail.component';
import {ProjectListComponent} from './codezen/project-list/project-list.component';

export const routes: Routes = [
  {path:"", redirectTo: "login", pathMatch: "full"},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'oauth-callback', component: OAuthCallbackComponent},
  {path: 'welcome', component: WelcomeComponent, canActivate: [authGuard]},
  {path: 'profile', component: ProfileComponent, canActivate: [authGuard]},
  {path: 'update-password', component: UpdatePasswordComponent, canActivate: [authGuard]},
  {path: 'edit-preferences', component: EditPreferencesComponent, canActivate: [authGuard]},
  {path: 'reset-password', component: ResetPasswordComponent},
  {path: 'enter-email', component: EnterEmailComponent},
  {path: 'codezen/projects', component: ProjectListComponent, canActivate: [authGuard]},
  {path: 'codezen/project/:id', component: ProjectDetailComponent, canActivate: [authGuard]},
  {path: 'codezen/project/:projectId/review/:reviewId', component: ReviewDetailComponent, canActivate: [authGuard]},
  {path:"admin", loadChildren:() =>
      import("./admin/admin.module").then(e => e.AdminModule)},
  {path:"user", loadChildren:() =>
      import("./user/user.module").then(e => e.UserModule)}
];
