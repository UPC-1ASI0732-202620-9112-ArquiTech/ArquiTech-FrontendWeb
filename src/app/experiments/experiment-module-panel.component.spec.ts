import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ExperimentModeService } from './experiment-mode.service';
import { ExperimentModulePanelComponent } from './experiment-module-panel.component';

@Component({ selector: 'app-experiment-workbench', template: '<p class="stub">{{ experimentId() }}</p>' })
class WorkbenchStubComponent {
  readonly projectId = input('');
  readonly experimentId = input('');
  readonly embedded = input(false);
  readonly changed = output<void>();
}

describe('Audit correction 8: additional functions start collapsed', () => {
  function render(enabled: boolean) {
    TestBed.configureTestingModule({
      imports: [ExperimentModulePanelComponent, TranslateModule.forRoot()],
      providers: [{ provide: ExperimentModeService, useValue: { enabled: () => enabled } }],
    });
    TestBed.overrideComponent(ExperimentModulePanelComponent, {
      set: { imports: [WorkbenchStubComponent, TranslatePipe] },
    });
    const fixture = TestBed.createComponent(ExperimentModulePanelComponent);
    fixture.componentRef.setInput('projectId', '1');
    fixture.componentRef.setInput('experiments', ['EC01']);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing in the original view (condition A)', () => {
    const fixture = render(false);
    expect(fixture.nativeElement.querySelector('.module-improvement')).toBeNull();
  });

  it('shows the panel collapsed and expands it on demand (condition B)', () => {
    const fixture = render(true);
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="module-improvement-toggle"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('app-experiment-workbench')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('improvements.panel.hide');
    expect(fixture.nativeElement.querySelector('app-experiment-workbench')).not.toBeNull();
  });
});
