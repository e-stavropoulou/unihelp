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
import { Toast } from '@capacitor/toast';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor() {}

  async present(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    console.log('🚨 Native Toast CALLED!', message, type);

    await Toast.show({
      text: message,
      duration: 'long'
    });
  }
}
