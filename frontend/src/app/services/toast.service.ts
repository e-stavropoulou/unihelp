/* import { Injectable, NgZone } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(
    private toastController: ToastController,
    private ngZone: NgZone
  ) {}

  async present(
    message: string,
    type: 'success' | 'error' | 'warning' = 'error'
  ) {
    console.log('🚨 ToastService.present CALLED!', message, type);
    let cssClass: string;
    let icon: string;

    switch (type) {
      case 'success':
        cssClass = 'toast-success';
        icon = '✅';
        break;
      case 'warning':
        cssClass = 'toast-warning';
        icon = '⚠️';
        break;
      default:
        cssClass = 'toast-error';
        icon = '❌';
    }

    await this.ngZone.run(async () => {
      const toast = await this.toastController.create({
        message: `${icon} ${message}`,
        duration: 3000,
        position: 'top',
        cssClass: [cssClass, 'toast-top-adjust']
      });

      console.log('👉 Showing toast:', message, type);
      await toast.present();
    });
  }
}
  */

import { Injectable } from '@angular/core';
import { ToastController, Platform } from '@ionic/angular';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private toastController: ToastController, private platform: Platform) {}

  async present(
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
    duration: number = 2000  // default σε ms
  ) {
    console.log('🚨 Toast CALLED!', message, type);
  
    if (Capacitor.isNativePlatform() && this.platform.is('capacitor')) {
      // Capacitor μόνο σε native
      await Toast.show({
        text: message,
        duration: duration < 2500 ? 'short' : 'long',
        position: 'center'
      });
    } else {
      // Ionic toast στο web
      const toast = await this.toastController.create({
        message,
        duration,
        color: this.getColor(type),
        position: 'top',
        cssClass: 'custom-toast',
        animated: true,
        mode: 'ios'
      });
      await toast.present();
    }
    
  }
  

  private getColor(type: 'success' | 'error' | 'warning'): string {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  }
}
