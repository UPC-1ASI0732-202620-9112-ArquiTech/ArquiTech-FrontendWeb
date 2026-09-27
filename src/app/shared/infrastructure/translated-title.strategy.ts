import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

/** Browser tab title in the selected language: "<Section> · ArquiTech". */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private lastKey = '';

  constructor() {
    super();
    this.translate.onLangChange.subscribe(() => this.apply(this.lastKey));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.lastKey = (route.data['titleKey'] as string | undefined) ?? '';
    this.apply(this.lastKey);
  }

  private apply(key: string): void {
    this.title.setTitle(key ? `${this.translate.instant(key)} · ArquiTech` : 'ArquiTech');
  }
}
