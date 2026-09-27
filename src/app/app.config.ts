import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authTokenInterceptor, httpErrorInterceptor } from './iam/interceptors/auth.interceptors';
import { PreferencesService } from './profile/services/preferences.service';
import { mockBackendInterceptor } from './shared/infrastructure/mock-backend/mock-backend.interceptor';
import { TranslatedTitleStrategy } from './shared/infrastructure/translated-title.strategy';
import { APP_ICONS } from './shared/presentation/icons';

export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, 'i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // Order matters: the token is added first and the mock (when enabled) answers last.
    provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor, mockBackendInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] },
      }),
      LucideAngularModule.pick(APP_ICONS),
    ),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideAppInitializer(() => firstValueFrom(inject(PreferencesService).initialize())),
  ],
};
