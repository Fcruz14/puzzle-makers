import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapC } from './map';

describe('MapC', () => {
  let component: MapC;
  let fixture: ComponentFixture<MapC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapC);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
