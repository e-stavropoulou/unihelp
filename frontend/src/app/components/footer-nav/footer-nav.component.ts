import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ChatService } from 'src/app/services/chat.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-footer-nav',
  standalone: true,
  templateUrl: './footer-nav.component.html',
  styleUrls: ['./footer-nav.component.scss'],
  imports: [IonicModule, RouterModule, CommonModule],
})
export class FooterNavComponent implements OnInit {
  unreadCount$!: Observable<number>;
  unreadMessages$!: Observable<number>;
  

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private cdRef: ChangeDetectorRef   // ✅ Αναγκάζει re-render
  ) {}

  ngOnInit(): void {
    // 🎯 Παίρνεις μόνο το .asObservable() μέρος
    this.unreadCount$ = this.notificationsService.unreadCount$.asObservable();
    this.unreadMessages$ = this.chatService.unreadMessages$.asObservable();

    // ✅ Αρχική φόρτωση
    this.notificationsService.refreshUnreadCount();
    this.chatService.refreshUnreadMessages();

    // ✅ Force UI update όταν αλλάζει κάποιο badge
    this.notificationsService.unreadCount$.subscribe(() => {
      this.cdRef.detectChanges();
    });

    this.chatService.unreadMessages$.subscribe(() => {
      this.cdRef.detectChanges();
    });
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
