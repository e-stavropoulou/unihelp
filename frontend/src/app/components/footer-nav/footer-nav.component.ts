import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-footer-nav',
  standalone: true,
  imports: [IonicModule, RouterModule, CommonModule],
  templateUrl: './footer-nav.component.html',
  styleUrls: ['./footer-nav.component.scss'],
})
export class FooterNavComponent implements OnInit {
  unreadCount$ = this.notificationsService.unreadCount$;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.notificationsService.refreshUnreadCount(); // ✅ αρχική φόρτωση badge
  }

  async logout() {
    this.authService.clearToken();
    await this.toastService.present('Αποσυνδεθήκατε.', 'error', 400);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  enableNotifications() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.notificationsService.initPush(userId);
    } else {
      console.warn('❗️No user ID available για να αποθηκευτεί το token.');
    }
  }
}
