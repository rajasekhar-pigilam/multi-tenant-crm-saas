import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'crm-root',
  standalone: true,
  imports: [RouterOutlet],
  template: ` <router-outlet /> `
})
export class AppComponent {}
