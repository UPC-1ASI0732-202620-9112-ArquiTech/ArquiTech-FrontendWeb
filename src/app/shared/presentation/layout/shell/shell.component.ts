import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TERMS_URL } from '../../../legal-links';
import { TopbarComponent } from '../topbar/topbar.component';

/** Authenticated layout: sidebar + top bar + routed content (Navigation Systems, report 4.2.5). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslatePipe, SidebarComponent, TopbarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly termsUrl = TERMS_URL;
  protected readonly navOpen = signal(false);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
