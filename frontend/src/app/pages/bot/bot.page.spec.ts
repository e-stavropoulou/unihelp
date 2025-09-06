import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotPage } from './bot.page';

describe('BotPage', () => {
  let component: BotPage;
  let fixture: ComponentFixture<BotPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BotPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
