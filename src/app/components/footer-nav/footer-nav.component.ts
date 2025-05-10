import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';



@Component({
  selector: 'app-footer-nav',
  standalone: true,
  imports: [IonicModule, RouterModule],
  templateUrl: './footer-nav.component.html',
  styleUrls: ['./footer-nav.component.scss'],
})
export class FooterNavComponent {
  constructor(private router: Router, private toastController: ToastController, private authService: AuthService) {}

  async logout() {
    this.authService.clearUser(); 
    const toast = await this.toastController.create({
      message: 'Αποσυνδεθήκατε.',
      duration: 2000,
      position: 'top',
      cssClass: 'toast-error'
    });
    await toast.present();
    this.router.navigateByUrl('/login', { replaceUrl: true }).then(() => {
      window.location.reload(); // Αναγκαστικό refresh μετά την αποσύνδεση
    });
  }
}
