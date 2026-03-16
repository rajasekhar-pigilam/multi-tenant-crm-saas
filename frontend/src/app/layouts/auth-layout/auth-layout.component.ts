import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'crm-auth-layout',
  standalone: true,
  imports: [RouterOutlet, MatCardModule],
  template: `
    <div
      style="
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(135deg, #1d4ed8, #0f172a);
      "
    >
      <mat-card style="width: min(100%, 520px); position: relative; overflow: hidden">
        <router-outlet />
      </mat-card>
    </div>
  `
})
export class AuthLayoutComponent {}
