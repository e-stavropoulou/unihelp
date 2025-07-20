import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-footer-nav',
  standalone: true,
  imports: [IonicModule, RouterModule],
  templateUrl: './footer-nav.component.html',
  styleUrls: ['./footer-nav.component.scss'],
})
export class FooterNavComponent {
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  async logout() {
    this.authService.clearToken();

    // ✅ Εμφάνιση toast από το ToastService
    await this.toastService.present('Αποσυνδεθήκατε.', 'error', 400);

    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
