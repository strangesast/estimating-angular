import { 
  EventEmitter,
  OnChanges,
  Component,
  OnInit,
  Output,
  Input
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { BehaviorSubject } from 'rxjs';

// for use in edit page in '.main' and on build / elsewhere in lower window

import { ComponentElement, Child, FolderElement } from '../../models/classes';

@Component({
  selector: 'app-edit-window',
  templateUrl: './edit-window.component.html',
  styleUrls: ['./edit-window.component.less']
})
export class EditWindowComponent implements OnInit, OnChanges {
  @Input() config: any;
  @Input() element: BehaviorSubject<ComponentElement|FolderElement|Child|null>;
  public _element: ComponentElement|FolderElement|Child|null;
  public type: string = 'unknown';
  @Output() close = new EventEmitter();
  private form: FormGroup;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.element.subscribe(element => {
      this._element = element;
      this.type = element instanceof FolderElement ? element.type : element instanceof ComponentElement ? 'component' : element instanceof Child ? 'child' : 'unknown';
    });
  }

  ngOnChanges(changes) {}

  toggleOpen() {
    this.config.open = !this.config.open;
  }

  onClose() {
    this.close.emit();
  }
}
