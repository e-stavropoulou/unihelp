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
import { constructOutline } from 'ionicons/icons';
import { distinctUntilChanged } from 'rxjs/operators';


// Ionicons
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-footer-nav',
  standalone: true,
  templateUrl: './footer-nav.component.html',
  styleUrls: ['./footer-nav.component.scss'],
  imports: [IonicModule, RouterModule, CommonModule, IonIcon],
})
export class FooterNavComponent implements OnInit {


  
  unreadCount$ = this.notificationsService.unreadCount$;
  unreadMessages$ = this.chatService.unreadMessages$;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private cd: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.notificationsService.refreshUnreadCount();
    this.chatService.refreshUnreadMessages();
  }

  async logout() {
    this.authService.logout(false);
    await this.toastService.present('Αποσυνδεθήκατε.', 'error', 1200);
    setTimeout(() => {
      window.location.replace('/login');
    }, 1300);
  }
  

  enableNotifications() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.notificationsService.initPush();
    } else {
      console.warn('❗️No user ID available για να αποθηκευτεί το token.');
    }
  }
}
